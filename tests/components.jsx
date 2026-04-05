// Test components for ctg-react-state self-tests
// Each component exercises a specific state management pattern

import { useState } from "react";
import { useDistroState, useDistroStateRegistry } from "../src/CTGReactStateProvider.js";

// Counter — reads and writes a single registered key
export function Counter({ stateKey = "count" }) {
    const state = useDistroStateRegistry(stateKey);
    const value = state.get(stateKey);
    return (
        <div>
            <span data-testid={`${stateKey}-value`}>{String(value)}</span>
            <button data-testid={`${stateKey}-inc`} onClick={() => state.set(stateKey, (value || 0) + 1)}>+</button>
            <button data-testid={`${stateKey}-dec`} onClick={() => state.set(stateKey, (value || 0) - 1)}>-</button>
        </div>
    );
}

// Display — reads a key from state without registering (read-only via useDistroState)
export function Display({ stateKey }) {
    const state = useDistroState();
    return <span data-testid={`display-${stateKey}`}>{String(state.get(stateKey))}</span>;
}

// Writer — sets a key to a specific value on button click
export function Writer({ stateKey, value, label = "Write" }) {
    const state = useDistroStateRegistry(stateKey);
    return (
        <button data-testid={`write-${stateKey}`} onClick={() => state.set(stateKey, value)}>
            {label}
        </button>
    );
}

// MultiKeyDisplay — reads multiple keys with optional derivation
export function MultiKeyDisplay({ keys, deriveFn, testId = "derived" }) {
    const state = useDistroState();
    const value = deriveFn ? state.get(keys, deriveFn) : state.get(keys);
    return <span data-testid={testId}>{String(Array.isArray(value) ? JSON.stringify(value) : value)}</span>;
}

// NamespaceDisplay — reads all keys under a namespace prefix
export function NamespaceDisplay({ prefix, testId = "namespace" }) {
    const state = useDistroState();
    const ns = state.getNamespace(prefix);
    return <span data-testid={testId}>{JSON.stringify(ns)}</span>;
}

// Toggle — registers a boolean key and toggles it on click
export function Toggle({ stateKey = "active" }) {
    const state = useDistroStateRegistry(stateKey);
    const value = state.get(stateKey);
    return (
        <button data-testid={`toggle-${stateKey}`} onClick={() => state.set(stateKey, !value)}>
            {value ? "ON" : "OFF"}
        </button>
    );
}

// Probe — captures the state instance ref for direct API access in tests
export function Probe({ onState }) {
    const state = useDistroState();
    if (onState) onState(state);
    return null;
}

// ErrorDisplay — catches and displays errors from state operations
export function ErrorDisplay({ operation, testId = "error" }) {
    const state = useDistroState();
    const [error, setError] = useState(null);
    return (
        <div>
            <button data-testid={`${testId}-trigger`} onClick={async () => {
                try { await operation(state); setError(null); }
                catch (e) { setError(e); }
            }}>Trigger</button>
            <span data-testid={`${testId}-type`}>{error ? error.type || error.name : "none"}</span>
            <span data-testid={`${testId}-msg`}>{error ? error.message : "none"}</span>
        </div>
    );
}

// MutateButton — triggers a named mutator on click
export function MutateButton({ name, payload, testId = "mutate" }) {
    const state = useDistroState();
    return (
        <button data-testid={testId} onClick={() => state.mutate(name, payload)}>
            Mutate
        </button>
    );
}
