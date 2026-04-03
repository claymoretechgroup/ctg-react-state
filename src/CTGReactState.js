import CTGReactStateError from "./CTGReactStateError.js"; // Typed errors

// Distributed state registry — coordinates access to bound useState getter/setter pairs
export default class CTGReactState {

    /* Static Fields */

    static RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

    // CONSTRUCTOR :: OBJECT?, OBJECT?, OBJECT? -> this
    // shared: initial state values, states: pre-bound setters, config: { join?, strict? }
    constructor(shared = {}, states = {}, config = {}) {
        this._shared = { ...shared };
        this._states = { ...states };
        this._middleware = [];
        this._mutators = {};
        this._join = config.join !== undefined ? config.join : ".";
        this._strict = config.strict !== undefined ? config.strict : false;

        if (typeof this._join !== "string") {
            throw new CTGReactStateError("INVALID_CONFIG", "join must be a string");
        }
        if (typeof this._strict !== "boolean") {
            throw new CTGReactStateError("INVALID_CONFIG", "strict must be a boolean");
        }
    }

    /**
     *
     * Properties
     *
     */

    // GETTER :: VOID -> STRING
    get join() { return this._join; }

    // GETTER :: VOID -> BOOL
    get strict() { return this._strict; }

    /**
     *
     * Instance Methods
     *
     */

    // :: STRING|[STRING], ((* ...) -> *)? -> *|[*]
    // Single key: returns shared[id]. Array: returns values or applies derivation fn.
    get(id, fn) {
        if (Array.isArray(id)) {
            for (const key of id) CTGReactState._validateKey(key);
            const values = id.map((key) => this._shared[key]);
            return fn ? fn(...values) : values;
        }
        CTGReactState._validateKey(id);
        return this._shared[id];
    }

    // :: STRING|OBJECT, *|[STRING]?, ((* ...) -> *)? -> PROMISE(this)
    // Overloaded: set(id, val), set(object), set(id, [deps], fn).
    // Async — middleware pipeline is awaited.
    async set(id, value, fn) {
        // Overload 1: set(object) — multi-key
        if (typeof id === "object" && id !== null && !Array.isArray(id)) {
            if (this._strict) {
                throw new CTGReactStateError("STRICT_VIOLATION",
                    "Direct set not allowed in strict mode");
            }
            for (const [key, val] of Object.keys(id).map((k) => [k, id[k]])) {
                await this._setSingle(key, val);
            }
            return this;
        }

        // Overload 3: set(id, [deps], fn) — derived set
        if (Array.isArray(value) && typeof fn === "function") {
            if (this._strict) {
                throw new CTGReactStateError("STRICT_VIOLATION",
                    "Direct set not allowed in strict mode");
            }
            const depValues = value.map((key) => this._shared[key]);
            const computed = fn(...depValues);
            await this._setSingle(id, computed);
            return this;
        }

        // Overload 2: set(id, value) — single key
        if (this._strict) {
            throw new CTGReactStateError("STRICT_VIOLATION",
                "Direct set not allowed in strict mode");
        }
        await this._setSingle(id, value);
        return this;
    }

    // :: STRING, [*, (* -> VOID)] -> this
    // Registers a value/setter pair. Captures value into shared.
    register(id, binding) {
        if (!Array.isArray(binding) || binding.length < 2 || typeof binding[1] !== "function") {
            throw new CTGReactStateError("INVALID_BINDING",
                "register() requires [value, setter] array");
        }
        CTGReactState._validateKey(id);
        const [value, setter] = binding;
        this._shared[id] = value;
        this._states[id] = (val) => {
            this._shared[id] = val;
            setter(val);
        };
        return this;
    }

    // :: STRING -> this
    // Removes bound setter. Value persists in shared.
    unregister(id) {
        CTGReactState._validateKey(id);
        delete this._states[id];
        return this;
    }

    // :: VOID -> OBJECT
    // Returns shallow copy of shared state.
    export() {
        return { ...this._shared };
    }

    // :: OBJECT -> PROMISE(this)
    // Transactional: if any key's write fails, rolls back to pre-import state.
    // Uses _setSingle() directly (not set()) — this means import bypasses
    // strict mode intentionally. Import is a structured coordinated operation
    // that writes each key through the middleware pipeline and fires bound
    // setters, matching the spec's "goes through the same path as any other
    // state mutation" contract for middleware, but not for strict-mode gating.
    async import(snapshot) {
        const backup = this.export();
        const keysApplied = [];
        try {
            for (const key of Object.keys(snapshot)) {
                await this._setSingle(key, snapshot[key]);
                keysApplied.push(key);
            }
        } catch (err) {
            // Key validation errors propagate directly (no wrapping)
            if (err instanceof CTGReactStateError && err.type === "INVALID_KEY") {
                // Still rollback applied keys before rethrowing
                for (const key of keysApplied) {
                    if (key in backup) {
                        this._shared[key] = backup[key];
                        if (this._states[key]) this._states[key](backup[key]);
                    } else {
                        delete this._shared[key];
                        if (this._states[key]) this._states[key](undefined);
                    }
                }
                throw err;
            }
            // Rollback: restore exact pre-import shape
            for (const key of keysApplied) {
                if (key in backup) {
                    this._shared[key] = backup[key];
                    if (this._states[key]) this._states[key](backup[key]);
                } else {
                    delete this._shared[key];
                    if (this._states[key]) this._states[key](undefined);
                }
            }
            throw new CTGReactStateError("MIDDLEWARE_ERROR", "Import failed", {
                originalError: err, id: null, value: null, keysApplied
            });
        }
        return this;
    }

    // :: (STRING, *, * -> *|PROMISE(*)) -> this
    // Adds middleware to the set pipeline. Called in registration order.
    use(fn) {
        this._middleware.push(fn);
        return this;
    }

    // :: STRING -> OBJECT
    // Returns key/value pairs under a namespace prefix with prefix stripped.
    getNamespace(prefix) {
        const fullPrefix = prefix + this._join;
        const result = {};
        for (const key of Object.keys(this._shared)) {
            if (key.startsWith(fullPrefix)) {
                result[key.slice(fullPrefix.length)] = this._shared[key];
            }
        }
        return result;
    }

    // :: STRING, OBJECT -> PROMISE(this)
    // Sets each key with namespace prefix prepended.
    // NOTE: Bypasses strict mode intentionally — setNamespace is a structured
    // coordinated operation, not an ad-hoc write.
    async setNamespace(prefix, values) {
        for (const [key, val] of Object.entries(values)) {
            // Validate member key independently before prepending prefix
            CTGReactState._validateKey(key);
            await this._setSingle(prefix + this._join + key, val);
        }
        return this;
    }

    // :: STRING, (OBJECT -> OBJECT) -> this
    // Registers a named mutator function.
    mutator(name, fn) {
        CTGReactState._validateKey(name);
        if (typeof fn !== "function") {
            throw new CTGReactStateError("INVALID_MUTATOR", `Mutator fn must be a function, got ${typeof fn}`);
        }
        this._mutators[name] = fn;
        return this;
    }

    // :: STRING, *? -> PROMISE(this)
    // Executes a named mutator. Applies returned key/values via set.
    async mutate(name, payload) {
        const fn = this._mutators[name];
        if (!fn) {
            throw new CTGReactStateError("UNKNOWN_MUTATOR", `Unknown mutator: ${name}`);
        }
        // Deep clone then freeze to prevent mutation without affecting live state
        const frozenCopy = CTGReactState._deepFreeze(CTGReactState._deepClone(this._shared));
        const updates = await fn(frozenCopy, payload);
        // Validate mutator return shape
        if (updates === null || updates === undefined || typeof updates !== "object" || Array.isArray(updates)) {
            throw new CTGReactStateError("INVALID_MUTATOR",
                `Mutator '${name}' must return a plain object, got ${Array.isArray(updates) ? "array" : typeof updates}`);
        }
        for (const [key, val] of Object.entries(updates)) {
            await this._setBypassStrict(key, val);
        }
        return this;
    }

    /**
     *
     * Private Methods
     *
     */

    // :: STRING, * -> PROMISE(VOID)
    // Single-key set with key validation and middleware pipeline.
    async _setSingle(id, value) {
        CTGReactState._validateKey(id);

        const prevValue = this._shared[id];
        let nextValue = value;

        // Run middleware pipeline
        if (this._middleware.length > 0) {
            try {
                for (const mw of this._middleware) {
                    nextValue = await mw(id, nextValue, prevValue);
                }
            } catch (err) {
                throw new CTGReactStateError("MIDDLEWARE_ERROR", `Middleware rejected set for '${id}'`, {
                    originalError: err, id, value
                });
            }
        }

        // Write to shared and fire bound setter
        this._shared[id] = nextValue;
        if (this._states[id]) {
            this._states[id](nextValue);
        }
    }

    // :: STRING, * -> PROMISE(VOID)
    // Set that bypasses strict mode check (used by mutate).
    async _setBypassStrict(id, value) {
        await this._setSingle(id, value);
    }

    /**
     *
     * Static Methods
     *
     */

    // :: *, WeakSet? -> *
    // Recursively clones an object/array with cycle detection.
    // Cyclic references are replaced with null to prevent stack overflow.
    // NOTE: This is intentionally lossy — shared references that appear
    // multiple times in the object graph are cloned independently on first
    // visit, then become null on subsequent visits. Mutators should not
    // rely on reference identity between values in the frozen copy.
    static _deepClone(value, seen) {
        if (value === null || typeof value !== "object") return value;
        if (!seen) seen = new WeakSet();
        if (seen.has(value)) return null; // break cycle
        seen.add(value);
        if (Array.isArray(value)) return value.map((item) => CTGReactState._deepClone(item, seen));
        const clone = {};
        for (const [key, val] of Object.entries(value)) {
            clone[key] = CTGReactState._deepClone(val, seen);
        }
        return clone;
    }

    // :: OBJECT -> OBJECT
    // Recursively freezes an object and all nested objects/arrays.
    static _deepFreeze(obj) {
        Object.freeze(obj);
        for (const value of Object.values(obj)) {
            if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
                CTGReactState._deepFreeze(value);
            }
        }
        return obj;
    }

    // Static Factory Method :: OBJECT?, OBJECT?, OBJECT? -> ctgReactState
    static init(shared, states, config) {
        return new this(shared, states, config);
    }

    // :: STRING -> VOID
    // Validates a key is a non-empty string and not a reserved name.
    static _validateKey(id) {
        if (typeof id !== "string" || id.length === 0) {
            throw new CTGReactStateError("INVALID_KEY", `Key must be a non-empty string, got: ${id}`);
        }
        if (CTGReactState.RESERVED_KEYS.has(id)) {
            throw new CTGReactStateError("INVALID_KEY", `Reserved key: ${id}`);
        }
    }
}
