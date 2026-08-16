# CTG React State — Implementation Spec

**Source:** `js/ctg-react-state/docs/ctg-react-state-requirements.md`
**Language:** JavaScript (ESM, Node.js/Browser)
**Code Style:** `ctg-project-proc/code-styles/js-code-style.md`

---

## Requirements Doc Divergences

### JavaScript Implementation With TypeScript Declarations

**Requirements doc says:** ES2020+, with TypeScript-style signatures in examples.

**This spec says:** Runtime implementation remains plain JavaScript with ESM.
Type contracts are documented via HM-style signatures in comments and shipped
as `.d.ts` declaration files for TypeScript consumers. No build step.

### Single Package, Not Monorepo

**Requirements doc says:** `packages/core`, `packages/snapshot`, `packages/react`,
`packages/devtools`.

**This spec says:** Single package. Core, snapshot, and React integration in one
package. DevTools deferred to a future project. Peer dependency on React isolates
the React integration — the core class is usable standalone without React.

### Open Questions Resolved

1. **Computed state caching:** Not in 2.0.0. Derivations are computed on read.
   Memoization is a future optimization if profiling shows it's needed.
2. **Selector optimization:** Not in 2.0.0. Components re-render when any
   registered key changes. `useSelector`-style optimization is a future enhancement.
3. **DevTools:** Deferred. The snapshot/export data model supports it.
4. **SSR:** `export()`/`import()` provides the serialization mechanism. The provider
   accepts initial state via props for hydration. No special SSR API in 2.0.0.
5. **React Server Components:** Out of scope. The registry is inherently client-side.
6. **Testing:** Use `ctg-react-test` for React integration tests, standalone
   `ctg-js-test` for core class tests.
7. **Re-registration optimization:** The implementation uses a ref for the current value and
   registers only on mount. The effect dependency is the `id`, not the value.
   This prevents unnecessary re-registration on every state change.
8. **Persistence adapters:** Not built-in. The pluggable storage backend on
   CTGReactStateSnapshot covers this. Adapters are userland.
9. **Batched set:** Rely on React 18+ automatic batching. No explicit `batch()`
   method. Multi-key `set({ key: value, ... })` fires setters sequentially;
   React batches them within the same microtask.

### CJS Compatibility Deferred

**Requirements doc says:** ESM-first with CJS compatibility via dual exports.

**This spec says:** ESM only. Consistent with `ctg-js-test` and all CTG JS projects.

---

## File Layout

```
ctg-react-state/
├── src/
│   ├── CTGReactState.js              # Core state registry
│   ├── CTGReactStateError.js         # Typed error class
│   ├── CTGReactStateSnapshot.js      # Snapshot and time-travel
│   ├── CTGReactStateProvider.js      # React context provider + hooks
│   ├── index.js                      # Package entry point
│   └── types/                        # TypeScript declarations for package exports
├── tests/
│   └── SelfTest.js                   # Self-tests (ctg-js-test pipelines)
├── docs/
│   ├── ctg-react-state-requirements.md
│   └── spec.md                       # This file
└── package.json
```

### package.json

```json
{
    "name": "ctg-react-state",
    "version": "2.0.0",
    "type": "module",
    "exports": {
        ".": {
            "types": "./src/types/index.d.ts",
            "default": "./src/index.js"
        }
    },
    "types": "./src/types/index.d.ts",
    "peerDependencies": {
        "react": ">=18.0.0"
    },
    "peerDependenciesMeta": {
        "react": { "optional": true }
    }
}
```

- **`"type": "module"`** — all `.js` files are ESM
- **`"exports"`** — one root entry point; default export is `CTGReactState`, named exports are `CTGReactState`, `CTGReactStateError`, `CTGReactStateSnapshot`, `CTGReactStateProvider`, `useDistroState`, and `useDistroStateRegistry`
- **`"types"`** — TypeScript declarations for the root export, public classes, provider props, hooks, config, middleware, mutators, snapshots, and error lookup shapes
- **React is an optional peer dep** — core and snapshot classes work without React
- **No runtime dependencies**

---

## Class: CTGReactState

**File:** `src/CTGReactState.js`
**Requirements doc ref:** Sections 3, 4

Core state registry. Manages `shared` state (plain object of values keyed by ID)
and `states` (bound setter functions keyed by ID). Usable standalone without React.

### Instance Fields

```javascript
_shared      // OBJECT — flat key/value state store
_states      // OBJECT — bound setter functions keyed by ID
_middleware  // [FUNCTION] — middleware pipeline for set()
_mutators    // OBJECT — named mutator functions (strict mode)
_join        // STRING — namespace join operator (default: ".")
_strict      // BOOL — strict mode (reject raw set, require mutators)
```

### Constructor

```javascript
// CONSTRUCTOR :: OBJECT?, OBJECT?, OBJECT? -> this
// shared: initial state values (default: {})
// states: pre-bound setter functions (default: {})
// config: { join?, strict? } (default: { join: ".", strict: false })
constructor(shared = {}, states = {}, config = {})
```

### Properties

```javascript
// GETTER :: VOID -> STRING
get join()

// GETTER :: VOID -> BOOL
get strict()
```

### Instance Methods

```javascript
// :: STRING|[STRING], ((* ...) -> *)? -> *|[*]
// Single key: returns shared[id].
// Array of keys: returns values as array, or applies transform fn.
// NOTE: Derived values are computed on read, not cached.
get(id, fn)
```

When `id` is a string, returns `this._shared[id]`.
When `id` is an array, collects values for each key. If `fn` is provided,
calls `fn(...values)` and returns the result. If `fn` is not provided,
returns the values as an array.

```javascript
// :: STRING|OBJECT, *|[STRING]?, ((* ...) -> OBJECT)? -> PROMISE(this)
// Single key + value: sets shared[id] and fires bound setter.
// Object: sets each key/value pair.
// Derived set: set(id, [deps], fn) — computes value from deps and stores at id.
// NOTE: In strict mode, raw set throws. Use mutate() instead.
// Returns Promise because middleware pipeline is async.
// Chainable via await.
async set(id, value, fn)
```

Overloaded signatures:
1. `set(id, value)` — single key/value
2. `set(object)` — multi-key from object
3. `set(id, [deps], fn)` — derived set (reads deps, applies fn, stores at id)

Each set call runs the middleware pipeline before writing. Middleware is async —
each middleware function is `await`ed in registration order. If any middleware
throws (or rejects), the set is rejected and the error propagates to the caller.
The value is NOT written to `shared` and the bound setter is NOT called.

**Async set and React batching:** Because `set()` is async, multiple `set()` calls
in the same synchronous block will NOT be batched by React's automatic batching
(which batches synchronous setState calls within the same microtask). To batch
multiple sets, use the multi-key form: `await state.set({ key1: val1, key2: val2 })`.
Alternatively, `set()` without middleware has no async overhead and the middleware
pipeline short-circuits (skips `await`) when the middleware array is empty, keeping
the common case fast.

**Key validation:** All methods that accept keys (`set`, `get`, `register`,
`unregister`, `import`, `setNamespace`) validate keys before use:
- Keys must be non-empty strings. Non-string or empty keys throw
  `CTGReactStateError("INVALID_KEY")`.
- Reserved keys `__proto__`, `constructor`, and `prototype` are rejected with
  `CTGReactStateError("INVALID_KEY", "Reserved key: {key}")`. This prevents
  prototype pollution when ingesting untrusted objects via `set(object)`,
  `import(snapshot)`, or `setNamespace(prefix, values)`.
- `import()` and `set(object)` iterate using `Object.keys()` (not `for...in`)
  to avoid inherited properties.

In strict mode, signatures 1 and 2 throw
`CTGReactStateError("STRICT_VIOLATION", "Direct set not allowed in strict mode")`.
Only `mutate()` can write in strict mode. Signature 3 (derived set) is also
blocked in strict mode.

```javascript
// :: STRING, [*, (* -> VOID)] -> this
// Registers a value/setter pair for a key.
// Captures current value into shared. Stores bound setter.
// Chainable.
register(id, binding)
```

`binding` is `[value, setter]` — the return value of React's `useState`.
NOTE: The requirements doc uses `[get, set]` terminology from distro-state.
This spec uses `[value, setter]` to match React's `useState` return shape,
which is `[currentValue, setterFunction]`, not `[getterFunction, setterFunction]`.
The semantics are identical — the first element is the current value (read),
the second is the setter (write).
On registration:
1. `this._shared[id] = value` (captures current value)
2. `this._states[id]` stores a wrapper that calls both `setter(value)` and
   updates `this._shared[id]`

```javascript
// :: STRING -> this
// Removes the bound setter for a key.
// Does NOT remove the value from shared (state persists after unmount).
// Chainable.
unregister(id)
```

```javascript
// :: VOID -> OBJECT
// Returns a shallow copy of shared state.
export()
```

```javascript
// :: OBJECT -> PROMISE(this)
// Imports state from a snapshot object. Transactional: if any key's set()
// fails (middleware rejection), the entire import is rolled back to the
// pre-import state. Goes through middleware for each key.
// Async because set() is async. Chainable via await.
async import(snapshot)
```

**Transactional import:** Before iterating, `import()` captures a backup via
`export()`. If any `set()` call throws during the import, the backup is restored
by writing directly to `_shared` (bypassing middleware) and firing all bound
setters for the affected keys. This ensures `import()` and `restore()` are
atomic with respect to in-memory registry state (`_shared` and bound setters) —
either all keys are applied or none are. External side effects performed by
middleware (logging, persistence writes, remote calls) before the failure point
are NOT rolled back. Middleware authors should be aware that their side effects
may execute for some keys even when the overall import fails.

```javascript
// Pseudocode for import():
async import(snapshot) {
    const backup = this.export();
    const keysApplied = [];
    try {
        for (const [key, value] of Object.entries(snapshot)) {
            await this.set(key, value);
            keysApplied.push(key);
        }
    } catch (err) {
        // Rollback: restore exact pre-import shape (no middleware)
        for (const key of keysApplied) {
            if (key in backup) {
                this._shared[key] = backup[key];
                if (this._states[key]) this._states[key](backup[key]);
            } else {
                // Key did not exist before import — delete it
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
```

```javascript
// :: (STRING, *, * -> *|PROMISE(*)) -> this
// Adds a middleware function to the set pipeline.
// Middleware receives (id, nextValue, prevValue) and returns the value to write.
// Middleware may be sync or async — each is await'd in registration order.
// Chainable.
use(fn)
```

```javascript
// :: STRING -> OBJECT
// Returns all key/value pairs under a namespace prefix.
// Keys in the returned object have the prefix stripped.
getNamespace(prefix)
```

Filters `_shared` keys that start with `prefix + this._join`. Returns an object
with the prefix and join operator stripped from each key.

```javascript
// :: STRING, OBJECT -> PROMISE(this)
// Sets all key/value pairs under a namespace prefix.
// Prepends prefix + join to each key and calls set().
// Async because set() is async. Chainable via await.
async setNamespace(prefix, values)
```

```javascript
// :: STRING, (OBJECT -> OBJECT) -> this
// Registers a named mutator function for strict mode.
// The mutator receives the full shared state and returns an object
// of key/value pairs to update.
// Chainable.
mutator(name, fn)
```

```javascript
// :: STRING, *? -> PROMISE(this)
// Executes a named mutator. Only available when strict mode is enabled
// or when using mutators voluntarily.
// The mutator's return object is applied via set() for each key.
// payload is an optional argument passed to the mutator function as
// second argument: fn(shared, payload).
// Async because set() is async. Chainable via await.
async mutate(name, payload)
```

### Static Methods

```javascript
// Static Factory Method :: OBJECT?, OBJECT?, OBJECT? -> ctgReactState
static init(shared, states, config)
```

### Language-Specific Decisions

- **No getter/setter proxy** — `shared` is a plain object, not a Proxy. Reads
  and writes go through `get()`/`set()` methods, not property access. This keeps
  the code debuggable and avoids Proxy edge cases.
- **Middleware is async by default** — middleware functions are `await`ed in order.
  They may return a value directly (sync) or return a Promise (async). This supports
  real-world use cases like persisting to localStorage, logging to a remote service,
  or validating against an API. When the middleware array is empty, `set()` skips
  the async pipeline entirely for zero overhead in the common case.
- **Shallow copy on export** — `export()` returns `{ ...this._shared }`. Deep
  cloning is the caller's responsibility if shared values contain nested objects.
- **Import goes through the write pipeline** — `import()` writes each key through
  the middleware pipeline and fires bound setters, matching the spec's "same path
  as any other state mutation" contract for middleware. However, `import()` and
  `setNamespace()` intentionally bypass strict-mode gating — they are structured
  coordinated operations, not ad-hoc writes. In strict mode, only raw `set()`
  calls are blocked; `import()`, `setNamespace()`, and `mutate()` are allowed.
- **Mutator isolation** — mutators receive a frozen shallow copy of `_shared`,
  not the live reference. In-place mutation of the shared object inside a mutator
  function throws a TypeError. All state changes must be returned as an update
  object from the mutator.

---

## Class: CTGReactStateError

**File:** `src/CTGReactStateError.js`

Typed error class extending `Error` with bidirectional name/code lookup.
Consistent with the error class pattern from `ctg-js-test` and `ctg-js-api-client`.

### Static Fields

```javascript
static TYPES = {
    // 1xxx — State operations
    INVALID_KEY:         1000,
    STRICT_VIOLATION:    1001,
    UNKNOWN_MUTATOR:     1002,
    MIDDLEWARE_ERROR:     1003,
    // 2xxx — Snapshot operations
    SNAPSHOT_NOT_FOUND:  2000,
    SNAPSHOT_ERROR:      2001,
    // 3xxx — Registration
    INVALID_BINDING:     3000,
    INVALID_CONFIG:      3001
};
```

### Constructor

```javascript
// CONSTRUCTOR :: STRING|INT, STRING?, * -> this
// Accepts type name or numeric code. Resolves both via bidirectional lookup.
// Unknown types or codes throw TypeError immediately.
constructor(typeOrCode, msg, data)
```

### Properties

```javascript
// GETTER :: VOID -> STRING
get type()

// GETTER :: VOID -> INT
get code()

// GETTER :: VOID -> STRING
get msg()

// GETTER :: VOID -> *
get data()
```

### Static Methods

```javascript
// :: STRING|INT -> INT|STRING|NULL
// Bidirectional lookup. Returns null if not found (does not throw).
static lookup(key)
```

### Error Codes

| Code | Type | Description |
|------|------|-------------|
| 1000 | INVALID_KEY | Key is not a string or is empty |
| 1001 | STRICT_VIOLATION | Direct set/derived set in strict mode |
| 1002 | UNKNOWN_MUTATOR | mutate() called with unregistered name |
| 1003 | MIDDLEWARE_ERROR | Middleware threw during set pipeline |
| 2000 | SNAPSHOT_NOT_FOUND | restore() with unknown snapshot key |
| 2001 | SNAPSHOT_ERROR | Snapshot save/restore failure |
| 3000 | INVALID_BINDING | register() with invalid [value, setter] pair |
| 3001 | INVALID_CONFIG | Invalid constructor config (join, strict, etc.) |

---

## Class: CTGReactStateSnapshot

**File:** `src/CTGReactStateSnapshot.js`
**Requirements doc ref:** Section 5

Snapshot storage and time-travel. Loosely coupled to CTGReactState via
`export()`/`import()` interface.

### Instance Fields

```javascript
_state       // ctgReactState — bound state instance
_snapshots   // OBJECT — stored snapshots keyed by identifier
_order       // [STRING] — ordered list of snapshot keys
_cursor      // INT — current position in the order (-1 = no position)
_storage     // OBJECT|VOID — optional pluggable storage backend
_maxHistory  // INT|VOID — maximum number of retained snapshots
_auto        // BOOL — automatic snapshotting on every set()
```

### Constructor

```javascript
// CONSTRUCTOR :: ctgReactState, OBJECT? -> this
// Binds to a CTGReactState instance.
// opts: { storage?, maxHistory?, auto? }
// If auto is true, registers middleware on the state instance to capture
// a snapshot before every set().
constructor(stateInstance, opts = {})
```

If `opts.auto` is `true`, the constructor calls `stateInstance.use(...)` to register
a middleware function that calls `this.save()` before each set. The middleware
returns the value unchanged (pass-through) — it only captures the snapshot as a
side effect.

### Instance Methods

```javascript
// :: STRING? -> PROMISE(this)
// Saves current state as a snapshot.
// Key defaults to auto-incrementing index.
// Trims to maxHistory if configured.
// Async (storage backend may be async). Chainable via await.
async save(key)
```

Calls `this._state.export()` and stores the result. If `_maxHistory` is set and
the number of snapshots exceeds it, the oldest snapshot is removed.

If a pluggable `_storage` backend is configured, delegates to `storage.save(key, data)`.

```javascript
// :: STRING -> PROMISE(this)
// Restores a previously saved snapshot.
// Calls this._state.import(snapshot) which is async (middleware).
// Sets cursor to the restored key's position.
// Async. Chainable via await.
async restore(key)
```

```javascript
// :: VOID -> PROMISE([STRING])
// Returns available snapshot keys in insertion order.
// Async (storage backend may be async).
async list()
```

```javascript
// :: VOID -> PROMISE(this)
// Moves cursor back one position and restores that snapshot.
// No-op if already at the beginning.
// Async (calls restore). Chainable via await.
async back()
```

```javascript
// :: VOID -> PROMISE(this)
// Moves cursor forward one position and restores that snapshot.
// No-op if already at the end.
// Async (calls restore). Chainable via await.
async forward()
```

```javascript
// :: VOID -> STRING|VOID
// Returns the key at the current cursor position, or null if no position.
current()
```

```javascript
// :: VOID -> PROMISE(this)
// Removes all stored snapshots and resets cursor.
// Async (storage backend may be async). Chainable via await.
async clear()
```

### Pluggable Storage Interface

Any object implementing these methods (all may be sync or async):

```javascript
async save(key, data)    // Store snapshot data under key
async load(key)          // Retrieve snapshot data by key, or null
async list()             // Return array of keys in order
async remove(key)        // Remove a snapshot by key
```

All storage methods are `await`ed, so backends can be synchronous (localStorage)
or asynchronous (IndexedDB, remote API). When a storage backend is configured,
`save`, `restore`, `list`, and `clear` delegate to the storage backend instead
of using in-memory `_snapshots`.

---

## Class: CTGReactStateProvider

**File:** `src/CTGReactStateProvider.js`
**Requirements doc ref:** Section 6

React context provider and hooks for wiring components into the CTGReactState
registry. This file exports the provider component and both hooks.

### Exports

```javascript
export function CTGReactStateProvider({ state, children, config })
export function useDistroState()
export function useDistroStateRegistry(id)
```

### CTGReactStateProvider :: { state?, children, config? } -> JSX

React component that creates a `CTGReactState` instance and provides it via context.

- `state` — optional initial `shared` values (passed to CTGReactState constructor)
- `config` — optional config (join, strict) passed to CTGReactState constructor
- `children` — child components

```javascript
function App() {
    return CTGReactStateProvider({ state: { count: 0, theme: "light" }, children: [YourApp] });
}
```

### useDistroState :: VOID -> ctgReactState

Hook that returns the CTGReactState instance from the nearest provider context.
Always returns the nearest provider's instance. For nested providers, components
naturally scope to whichever provider is nearest in the React tree — no explicit
scope identifier is needed.

NOTE: The requirements doc mentions an optional scope identifier for reaching
parent providers from nested scopes. This is deferred from 2.0.0 because
React's context system already provides natural scoping, and cross-scope access
adds complexity. If needed, components can receive the parent provider's instance
via props or a separate context.

### useDistroStateRegistry :: STRING -> ctgReactState

Hook that registers the calling component's `useState` for the given key.
Handles registration on mount and unregistration on unmount.

**Implementation:**
1. Read CTGReactState instance from context
2. Initialize local state: `const [value, setter] = useState(instance.get(id))`
   — initializes from `shared[id]` if it exists, otherwise `undefined`
3. On mount: call `instance.register(id, [value, setter])`
4. On unmount: call `instance.unregister(id)`
5. Store current value in a ref to avoid re-registration on every render
   (registration effect depends on `id`, not `value`)
6. Return the CTGReactState instance

```javascript
function Counter() {
    const state = useDistroStateRegistry("count");
    return React.createElement("div", null,
        React.createElement("span", null, state.get("count")),
        React.createElement("button", { onClick: () => state.set("count", state.get("count") + 1) }, "+")
    );
}
```

### Multiple Providers

Nested providers create independent CTGReactState instances. Components register
into the nearest provider. Each provider is a separate scope with its own `shared`
namespace.

---

## Error Handling

All state operation failures throw `CTGReactStateError` instances with typed codes.

| Condition | Error Type |
|-----------|-----------|
| `set()` in strict mode without mutator | `STRICT_VIOLATION` |
| `mutate()` with unknown mutator name | `UNKNOWN_MUTATOR` |
| Middleware throws | `MIDDLEWARE_ERROR` (wraps original error in `data`) |
| `restore()` with unknown key | `SNAPSHOT_NOT_FOUND` |
| `register()` with invalid binding | `INVALID_BINDING` |
| Invalid config (join, strict) | `INVALID_CONFIG` |
| `back()` at beginning | No-op (no error) |
| `forward()` at end | No-op (no error) |

Middleware errors wrap the original error: the `data` field of the
`CTGReactStateError` contains `{ originalError, id, value }` for single-key
`set()` failures, or `{ originalError, id: null, value: null, keysApplied }`
for `import()` failures (where multiple keys may have been partially applied
before rollback).

---

## Conformance Test Traceability

| Requirements Section | JS Mechanism |
|---|---|
| Registry (register/unregister/get/set) | CTGReactState instance methods |
| Multi-key get with derivation | `get([keys], fn)` overload |
| Multi-key set | `set(object)` overload |
| Derived set | `set(id, [deps], fn)` overload |
| Namespacing | `getNamespace`/`setNamespace` with configurable join operator |
| Export/Import | `export()` shallow copy, `import()` iterates through `set()` |
| Middleware | `use()` pipeline, called in order on every `set()` |
| Strict mode + mutators | `_strict` flag, `mutator()`/`mutate()` methods |
| Snapshots | CTGReactStateSnapshot with save/restore/back/forward/clear |
| Time-travel | Cursor-based navigation over ordered snapshot list |
| Auto-snapshots | Middleware hook registered in constructor |
| Pluggable storage | Storage interface delegated in save/restore/list/clear |
| Provider | CTGReactStateProvider creates instance, provides via context |
| useDistroState | Returns instance from context |
| useDistroStateRegistry | Registers useState binding, cleans up on unmount |

---

## What This Spec Does NOT Add

- No computed state caching/memoization
- No `useSelector`-style re-render optimization
- No DevTools browser extension or debug panel
- No React Server Components support
- No CJS compatibility (ESM only)
- No built-in persistence adapters (use pluggable storage)
- No explicit `batch()` method (rely on React 18+ batching)
- No deep clone on export (shallow copy only)
