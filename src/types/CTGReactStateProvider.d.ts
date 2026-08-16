import type { ReactElement, ReactNode } from "react";
import CTGReactState, { CTGReactStateConfig, CTGReactStateValues } from "./CTGReactState.js";

export interface CTGReactStateProviderProps<State extends CTGReactStateValues = CTGReactStateValues> {
    state?: Partial<State>;
    children?: ReactNode;
    config?: CTGReactStateConfig;
}

export function CTGReactStateProvider<State extends CTGReactStateValues = CTGReactStateValues>(
    props: CTGReactStateProviderProps<State>
): ReactElement;

export function useDistroState<State extends CTGReactStateValues = CTGReactStateValues>(): CTGReactState<State>;

export function useDistroStateRegistry<State extends CTGReactStateValues = CTGReactStateValues>(
    id: keyof State & string
): CTGReactState<State>;

export function useDistroStateRegistry<State extends CTGReactStateValues = CTGReactStateValues>(
    id: string
): CTGReactState<State>;
