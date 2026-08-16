import CTGReactState, { CTGReactStateValues } from "./CTGReactState.js";

export interface CTGReactStateSnapshotStorage<State extends CTGReactStateValues = CTGReactStateValues> {
    save(key: string, data: State): void | Promise<void>;
    load(key: string): State | null | undefined | Promise<State | null | undefined>;
    list(): string[] | Promise<string[]>;
    remove(key: string): void | Promise<void>;
}

export interface CTGReactStateSnapshotOptions<State extends CTGReactStateValues = CTGReactStateValues> {
    storage?: CTGReactStateSnapshotStorage<State> | null;
    maxHistory?: number | null;
    auto?: boolean;
}

export default class CTGReactStateSnapshot<State extends CTGReactStateValues = CTGReactStateValues> {
    constructor(stateInstance: CTGReactState<State>, opts?: CTGReactStateSnapshotOptions<State>);

    save(key?: string | null): Promise<this>;
    restore(key: string): Promise<this>;
    list(): Promise<string[]>;
    back(): Promise<this>;
    forward(): Promise<this>;
    current(): string | null;
    clear(): Promise<this>;
}
