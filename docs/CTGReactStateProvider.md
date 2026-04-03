# CTGReactStateProvider

React context provider and hooks for wiring components into the CTGReactState registry.

---

### CTGReactStateProvider :: { state?, children, config? } -> JSX

Creates a CTGReactState instance and provides it via React context. The instance is created once on mount — subsequent prop changes are ignored. Use `set()`/`import()` to update state after mount.

```javascript
function App() {
    return React.createElement(CTGReactStateProvider,
        { state: { count: 0, theme: "light" } },
        React.createElement(YourApp));
}
```

---

### useDistroState :: VOID -> ctgReactState

Returns the CTGReactState instance from the nearest provider. For direct API access without registering a binding.

```javascript
function Dashboard() {
    const state = useDistroState();
    const theme = state.get("theme");
    // ...
}
```

---

### useDistroStateRegistry :: STRING -> ctgReactState

Registers the calling component's `useState` for the given key. Handles registration on mount and unregistration on unmount. Returns the CTGReactState instance.

When external code calls `set(id, value)`, the registered component re-renders with the new value. Value persists in shared after unmount.

```javascript
function Counter() {
    const state = useDistroStateRegistry("count");
    return React.createElement("div", null,
        React.createElement("span", null, state.get("count")),
        React.createElement("button", {
            onClick: () => state.set("count", state.get("count") + 1)
        }, "+"));
}
```

---

### Multiple Providers

Nested providers create independent CTGReactState instances. Components register into the nearest provider.
