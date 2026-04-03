# ctg-react-state

`ctg-react-state` is a distributed state management library for React. It coordinates access to React's own `useState` setters across components without an external store. State lives in React's component tree — the library provides the addressing mechanism so any component (or external code) can read and write any registered key.

**Key Features:**

* **React is the store**: State lives in `useState`. No external store, no custom subscriptions, no syncing
* **Cross-component access**: Register a key in one component, read/write it from anywhere
* **Derived state**: `get(['price', 'quantity'], (p, q) => p * q)` — computed on read, no caching overhead
* **Async middleware**: Transform, validate, log, or persist on every `set()` — sync or async
* **Snapshots & time-travel**: Save/restore state, navigate with `back()`/`forward()`
* **Strict mode**: Opt-in enforced mutation patterns via named mutators
* **Zero dependencies**: Only React's `useState` hook

## Install

```
npm install ctg-react-state
```

Peer dependency: `react >= 18.0.0` (optional — core works standalone).

## Examples

### Basic Usage

Register state in a component and access it from anywhere:

```javascript
import { CTGReactStateProvider, useDistroStateRegistry } from "ctg-react-state";
import React from "react";

function Counter() {
    const state = useDistroStateRegistry("count");
    return React.createElement("div", null,
        React.createElement("span", null, state.get("count")),
        React.createElement("button", {
            onClick: () => state.set("count", state.get("count") + 1)
        }, "+")
    );
}

function App() {
    return React.createElement(CTGReactStateProvider, { state: { count: 0 } },
        React.createElement(Counter));
}
```

### Derived State

Compute values from multiple keys without storing them:

```javascript
const total = state.get(["price", "quantity"], (p, q) => p * q);
```

### Multi-Key Set

Update multiple keys at once:

```javascript
await state.set({ price: 29.99, quantity: 2 });
```

### Namespacing

Scope state with a configurable join operator:

```javascript
const state = CTGReactState.init({}, {}, { join: "." });
await state.set("sidebar.isOpen", true);
await state.set("sidebar.width", 300);
state.getNamespace("sidebar"); // { isOpen: true, width: 300 }
```

### Middleware

Add validation, logging, or persistence to every write:

```javascript
state.use(async (id, nextValue, prevValue) => {
    console.log(`${id}: ${prevValue} → ${nextValue}`);
    await persistToStorage(id, nextValue);
    return nextValue;
});
```

### Snapshots & Time-Travel

```javascript
import { CTGReactState, CTGReactStateSnapshot } from "ctg-react-state";

const state = CTGReactState.init({ count: 0 });
const snapshots = new CTGReactStateSnapshot(state);

await snapshots.save("before");
await state.set("count", 10);
await snapshots.save("after");

await snapshots.back();  // count restored to 0
await snapshots.forward(); // count restored to 10
```

### Strict Mode

Enforce mutation patterns with named mutators:

```javascript
const state = CTGReactState.init({ count: 0 }, {}, { strict: true });

state.mutator("increment", (shared) => ({ count: shared.count + 1 }));

await state.mutate("increment"); // count is now 1
await state.set("count", 5);    // throws STRICT_VIOLATION
```

### Standalone (No React)

The core class works without React:

```javascript
import CTGReactState from "ctg-react-state";

const state = CTGReactState.init({ theme: "light" });
await state.set("theme", "dark");
state.get("theme"); // "dark"
```

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `join` | string | `"."` | Namespace join operator |
| `strict` | boolean | `false` | Require named mutators for all writes |

## Notice

`ctg-react-state` is under active development. The core API is stable. Selector optimization, computed caching, and DevTools are planned for future versions.
