// Typed error class for ctg-react-state with bidirectional name/code lookup
export default class CTGReactStateError extends Error {

    /* Static Fields */

    static TYPES = {
        // 1xxx — State operations
        INVALID_KEY:         1000,
        STRICT_VIOLATION:    1001,
        UNKNOWN_MUTATOR:     1002,
        MIDDLEWARE_ERROR:     1003,
        INVALID_MUTATOR:     1004,
        // 2xxx — Snapshot operations
        SNAPSHOT_NOT_FOUND:  2000,
        SNAPSHOT_ERROR:      2001,
        // 3xxx — Registration
        INVALID_BINDING:     3000,
        INVALID_CONFIG:      3001
    };

    // CONSTRUCTOR :: STRING|INT, STRING?, * -> this
    // Accepts type name or numeric code. Unknown types/codes throw TypeError.
    constructor(typeOrCode, msg, data) {
        const resolved = CTGReactStateError._resolve(typeOrCode);
        const message = msg !== undefined && msg !== null ? msg : resolved.type;
        super(message);
        this._type = resolved.type;
        this._code = resolved.code;
        this._msg = message;
        this._data = data !== undefined ? data : null;
        this.name = "CTGReactStateError";
    }

    /**
     *
     * Properties
     *
     */

    // GETTER :: VOID -> STRING
    get type() { return this._type; }

    // GETTER :: VOID -> INT
    get code() { return this._code; }

    // GETTER :: VOID -> STRING
    get msg() { return this._msg; }

    // GETTER :: VOID -> *
    get data() { return this._data; }

    /**
     *
     * Static Methods
     *
     */

    // :: STRING|INT -> INT|STRING|NULL
    // Bidirectional lookup. Returns null if not found.
    static lookup(key) {
        if (typeof key === "string") {
            return key in CTGReactStateError.TYPES ? CTGReactStateError.TYPES[key] : null;
        }
        if (typeof key === "number") {
            for (const [name, code] of Object.entries(CTGReactStateError.TYPES)) {
                if (code === key) return name;
            }
            return null;
        }
        return null;
    }

    // :: STRING|INT -> {type: STRING, code: INT}
    // Resolves type/code from either direction. Throws TypeError for unknown.
    static _resolve(typeOrCode) {
        if (typeof typeOrCode === "string") {
            if (!(typeOrCode in CTGReactStateError.TYPES)) {
                throw new TypeError(`Unknown error type: ${typeOrCode}`);
            }
            return { type: typeOrCode, code: CTGReactStateError.TYPES[typeOrCode] };
        }
        if (typeof typeOrCode === "number") {
            for (const [name, code] of Object.entries(CTGReactStateError.TYPES)) {
                if (code === typeOrCode) return { type: name, code };
            }
            throw new TypeError(`Unknown error code: ${typeOrCode}`);
        }
        throw new TypeError(`CTGReactStateError expects string or number, got ${typeof typeOrCode}`);
    }
}
