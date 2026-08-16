export interface CTGReactStateErrorTypes {
    INVALID_KEY: 1000;
    STRICT_VIOLATION: 1001;
    UNKNOWN_MUTATOR: 1002;
    MIDDLEWARE_ERROR: 1003;
    INVALID_MUTATOR: 1004;
    SNAPSHOT_NOT_FOUND: 2000;
    SNAPSHOT_ERROR: 2001;
    INVALID_BINDING: 3000;
    INVALID_CONFIG: 3001;
}

export type CTGReactStateErrorType = keyof CTGReactStateErrorTypes;
export type CTGReactStateErrorCode = CTGReactStateErrorTypes[CTGReactStateErrorType];
export type CTGReactStateErrorKey = CTGReactStateErrorType | CTGReactStateErrorCode;

export type CTGReactStateErrorCodeType<Code extends CTGReactStateErrorCode> =
    Code extends 1000 ? "INVALID_KEY"
        : Code extends 1001 ? "STRICT_VIOLATION"
            : Code extends 1002 ? "UNKNOWN_MUTATOR"
                : Code extends 1003 ? "MIDDLEWARE_ERROR"
                    : Code extends 1004 ? "INVALID_MUTATOR"
                        : Code extends 2000 ? "SNAPSHOT_NOT_FOUND"
                            : Code extends 2001 ? "SNAPSHOT_ERROR"
                                : Code extends 3000 ? "INVALID_BINDING"
                                    : Code extends 3001 ? "INVALID_CONFIG"
                                        : never;

export default class CTGReactStateError extends Error {
    static TYPES: Readonly<CTGReactStateErrorTypes>;

    constructor(typeOrCode: CTGReactStateErrorKey, msg?: string | null, data?: unknown);

    get type(): CTGReactStateErrorType;
    get code(): CTGReactStateErrorCode;
    get msg(): string;
    get data(): unknown;

    static lookup<Type extends CTGReactStateErrorType>(key: Type): CTGReactStateErrorTypes[Type];
    static lookup<Code extends CTGReactStateErrorCode>(key: Code): CTGReactStateErrorCodeType<Code>;
    static lookup(key: string | number): CTGReactStateErrorCode | CTGReactStateErrorType | null;
}
