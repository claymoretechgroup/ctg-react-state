// Test components for ctg-react-state self-tests
// All components use React.createElement (no JSX transpiler)
// Each component exercises a specific state management pattern

import React from "react";
import { useDistroState, useDistroStateRegistry } from "../src/CTGReactStateProvider.js";

// Counter — reads and writes a single registered key
export function Counter({ stateKey = "count" }) {
    const state = useDistroStateRegistry(stateKey);
    const value = state.get(stateKey);
    return React.createElement("div", null,
        React.createElement("span", { "data-testid": `${stateKey}-value` }, String(value)),
        React.createElement("button", {
            "data-testid": `${stateKey}-inc`,
            onClick: () => state.set(stateKey, (value || 0) + 1)
        }, "+"),
        React.createElement("button", {
            "data-testid": `${stateKey}-dec`,
            onClick: () => state.set(stateKey, (value || 0) - 1)
        }, "-")
    );
}

// Display — reads a key from state without registering (read-only via useDistroState)
export function Display({ stateKey }) {
    const state = useDistroState();
    return React.createElement("span", { "data-testid": `display-${stateKey}` },
        String(state.get(stateKey)));
}

// Writer — sets a key to a specific value on button click
export function Writer({ stateKey, value, label = "Write" }) {
    const state = useDistroStateRegistry(stateKey);
    return React.createElement("button", {
        "data-testid": `write-${stateKey}`,
        onClick: () => state.set(stateKey, value)
    }, label);
}

// MultiKeyDisplay — reads multiple keys with optional derivation
export function MultiKeyDisplay({ keys, deriveFn, testId = "derived" }) {
    const state = useDistroState();
    const value = deriveFn
        ? state.get(keys, deriveFn)
        : state.get(keys);
    return React.createElement("span", { "data-testid": testId },
        String(Array.isArray(value) ? JSON.stringify(value) : value));
}

// NamespaceDisplay — reads all keys under a namespace prefix
export function NamespaceDisplay({ prefix, testId = "namespace" }) {
    const state = useDistroState();
    const ns = state.getNamespace(prefix);
    return React.createElement("span", { "data-testid": testId },
        JSON.stringify(ns));
}

// Toggle — registers a boolean key and toggles it on click
export function Toggle({ stateKey = "active" }) {
    const state = useDistroStateRegistry(stateKey);
    const value = state.get(stateKey);
    return React.createElement("button", {
        "data-testid": `toggle-${stateKey}`,
        onClick: () => state.set(stateKey, !value)
    }, value ? "ON" : "OFF");
}
