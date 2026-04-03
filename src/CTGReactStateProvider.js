import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react"; // React core
import CTGReactState from "./CTGReactState.js"; // State registry

// React context for CTGReactState instance
const CTGReactStateContext = createContext(null);

// :: { state?, children, config? } -> JSX
// Provider component that creates a CTGReactState instance and provides via context.
// NOTE: The CTGReactState instance is created once on mount. Subsequent changes to
// the state or config props are intentionally ignored — the instance is stable for
// the lifetime of the provider. To update state after mount, use the instance's
// set()/import() methods directly.
export function CTGReactStateProvider({ state, children, config }) {
    const instance = useMemo(
        () => CTGReactState.init(state || {}, {}, config || {}),
        [] // Created once on mount — prop changes after mount are ignored
    );

    return React.createElement(CTGReactStateContext.Provider, { value: instance }, children);
}

// :: VOID -> ctgReactState
// Returns the CTGReactState instance from the nearest provider.
export function useDistroState() {
    const instance = useContext(CTGReactStateContext);
    if (!instance) {
        throw new Error("useDistroState must be used within a CTGReactStateProvider");
    }
    return instance;
}

// :: STRING -> ctgReactState
// Registers the calling component's useState for the given key.
// Handles registration on mount and unregistration on unmount.
export function useDistroStateRegistry(id) {
    const instance = useDistroState();
    const initialValue = instance.get(id);
    const [value, setter] = useState(initialValue);
    const valueRef = useRef(value);

    // Keep ref in sync
    valueRef.current = value;

    useEffect(() => {
        // Register with current value and a setter that also updates local state
        instance.register(id, [valueRef.current, (newVal) => {
            setter(newVal);
        }]);

        return () => {
            instance.unregister(id);
        };
    }, [id, instance]);

    return instance;
}
