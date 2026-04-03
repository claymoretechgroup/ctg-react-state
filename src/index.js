// Package entry point — exports all public classes and React integration
import CTGReactState from "./CTGReactState.js"; // Core state registry
import CTGReactStateError from "./CTGReactStateError.js"; // Typed errors
import CTGReactStateSnapshot from "./CTGReactStateSnapshot.js"; // Snapshot/time-travel
import { CTGReactStateProvider, useDistroState, useDistroStateRegistry } from "./CTGReactStateProvider.js"; // React hooks

export {
    CTGReactState,
    CTGReactStateError,
    CTGReactStateSnapshot,
    CTGReactStateProvider,
    useDistroState,
    useDistroStateRegistry
};
export default CTGReactState;
