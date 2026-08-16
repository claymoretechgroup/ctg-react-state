import CTGReactStateError from "./CTGReactStateError.js";

export type CTGReactStateValues = object;
export type CTGReactStateValueMap = Record<string, unknown>;
export type CTGReactStateSetter<Value = unknown> = (value: Value) => void;
export type CTGReactStateBinding<Value = unknown> = [Value, CTGReactStateSetter<Value>];
export type CTGReactStateBindings = Record<string, CTGReactStateBinding>;

export interface CTGReactStateConfig {
    join?: string;
    strict?: boolean;
}

export type CTGReactStateMiddleware<Value = unknown> = (
    id: string,
    nextValue: Value,
    prevValue: unknown
) => Value | Promise<Value>;

export type CTGReactStateMutator<State extends CTGReactStateValues = CTGReactStateValues, Payload = unknown> = (
    shared: Readonly<State>,
    payload: Payload
) => Partial<State> | Promise<Partial<State>>;

export default class CTGReactState<State extends CTGReactStateValues = CTGReactStateValues> {
    static RESERVED_KEYS: Set<string>;

    constructor(shared?: Partial<State>, states?: CTGReactStateBindings, config?: CTGReactStateConfig);

    get join(): string;
    get strict(): boolean;

    get<Key extends keyof State & string>(id: Key): State[Key];
    get<Value = unknown>(id: string): Value;
    get<Keys extends readonly string[]>(id: Keys): unknown[];
    get<Keys extends readonly string[], Derived>(
        id: Keys,
        fn: (...values: unknown[]) => Derived
    ): Derived;

    set<Key extends keyof State & string>(id: Key, value: State[Key]): Promise<this>;
    set(id: string, value: unknown): Promise<this>;
    set(values: Partial<State>): Promise<this>;
    set<Keys extends readonly string[], Derived>(
        id: string,
        deps: Keys,
        fn: (...values: unknown[]) => Derived
    ): Promise<this>;

    register<Key extends keyof State & string>(id: Key, binding: CTGReactStateBinding<State[Key]>): this;
    register<Value = unknown>(id: string, binding: CTGReactStateBinding<Value>): this;

    unregister(id: string): this;

    export(): State;
    "import"(snapshot: Partial<State>): Promise<this>;

    use(fn: CTGReactStateMiddleware): this;

    getNamespace<ValueMap extends CTGReactStateValueMap = CTGReactStateValueMap>(prefix: string): ValueMap;
    setNamespace(prefix: string, values: CTGReactStateValueMap): Promise<this>;

    mutator<Payload = unknown>(name: string, fn: CTGReactStateMutator<State, Payload>): this;
    mutate<Payload = unknown>(name: string, payload?: Payload): Promise<this>;

    static init<State extends CTGReactStateValues = CTGReactStateValues>(
        shared?: Partial<State>,
        states?: CTGReactStateBindings,
        config?: CTGReactStateConfig
    ): CTGReactState<State>;
}

export { CTGReactStateError };
