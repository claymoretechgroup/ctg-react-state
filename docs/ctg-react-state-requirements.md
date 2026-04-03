# ctg-react-state

## Requirements & Design Considerations

**Lightweight distributed state management for React**
Built on React's own reactivity model

Claymore Tech Group — Draft, April 2026

---

## 1. Overview

ctg-react-state is a distributed state management library for React applications. It evolves the core design of distro-state — a registry of bound `useState` getter/setter pairs keyed by ID — into a general-purpose state management solution capable of enterprise-grade functionality without the complexity overhead of libraries like Redux.

The fundamental insight is that React's `useState` already provides reactivity, batching, concurrent mode compatibility, and Suspense support. Rather than building an external store and syncing it back into React (as Redux, Zustand, and Jotai do), ctg-react-state lets components keep their own `useState` and provides a coordination layer so other components can reach those setters. React *is* the store; ctg-react-state is the addressing mechanism.

### 1.1 Lineage

ctg-react-state is based on [distro-state](https://github.com/mastergray/distro-state) by mastergray. The core class (`DistroState`) and React integration layer (`DistroStateProvider`, `useDistroState`, `useDistroStateRegistry`) are the foundation upon which ctg-react-state extends.

---

## 2. Goals & Principles

### 2.1 Primary Goals

- Provide cross-component state access without prop drilling
- Achieve Redux-grade functionality (snapshots, time-travel, middleware, derived state, namespacing) without Redux-grade complexity
- Stay coupled only to React's `useState` hook — no external store, no custom subscription system
- Keep the core small enough that the entire source can be read and understood in one sitting
- Support incremental adoption — teams pay only for the features they use

### 2.2 Design Principles

- **React is the store:** State lives in React's component tree via `useState`. The library coordinates access to those setters, it does not replace them. This gives you React's batching, concurrent mode, and Suspense compatibility for free.
- **Composition over configuration:** Complex behavior (derived state, namespacing, snapshots) emerges from composing simple primitives, not from configuring a monolithic API.
- **No artificial boundaries:** Because there is no synchronous action/reducer cycle, there is no need for middleware abstractions (thunks, sagas, observables) to handle async side effects. Components call async functions and then call `set` — normal JavaScript control flow.
- **Durability through minimalism:** The library depends on exactly one React API (`useState`). The smaller the dependency surface, the less exposure to breaking changes across React versions.

---

## 3. Architecture

### 3.1 Core Classes

The library is organized around three composable primitives:

| Class | Responsibility | Depends On |
|-------|---------------|------------|
| **CTGReactState** | Registry of bound getter/setter pairs. Manages `shared` state and registered bindings. Provides `get`, `set`, `register`, `unregister`, `export`, `import`. | Nothing (standalone) |
| **CTGReactStateSnapshot** | Stores serialized copies of `shared` keyed by identifier. Provides `save`, `restore`, `list`, `back`, `forward` for time-travel. | CTGReactState (via export/import interface) |
| **CTGReactStateProvider** | React context provider and hooks for wiring components into the registry. | React, CTGReactState |

The coupling between classes is intentionally loose. CTGReactStateSnapshot interacts with CTGReactState only through the `export`/`import` interface. CTGReactStateProvider interacts with CTGReactState only through `register`, `unregister`, `get`, and `set`. Each class can be used independently or composed together.

### 3.2 How Reactivity Works

The reactivity model is inherited from distro-state and deserves explicit documentation because it is the core architectural differentiator:

1. A component calls `useDistroStateRegistry(id)`, which creates a local `useState` and registers the `[value, setter]` pair with the CTGReactState instance under the given ID.
2. On registration, the current value is captured into `shared[id]`, and a bound setter is stored in `states[id]` that both updates `shared[id]` and calls the React `setState`.
3. When any component (or external code) calls `set(id, value)`, the bound setter fires, which calls React's `setState` on the owning component, triggering a re-render.
4. `get(id)` reads directly from `shared[id]`, which is always in sync because every `set` call updates it.

There is no custom subscription system. React's own rendering cycle is the notification mechanism. This is why the library is inherently compatible with React's batching, concurrent features, and future React versions — it never steps outside React's reactivity model.

---

## 4. Core API (CTGReactState)

### 4.1 Ported from distro-state

The following methods are carried forward from distro-state with equivalent semantics:

| Method | Signature | Description |
|--------|-----------|-------------|
| **constructor** | `(shared?, states?) => this` | Initializes with optional shared state and optional pre-bound state handlers. |
| **init** | `static init(shared?, states?) => CTGReactState` | Static factory method. |
| **register** | `(id, [get, set]) => this` | Binds a getter/setter pair to a shared state key. Captures current value into `shared`. Chainable. |
| **unregister** | `(id) => this` | Removes the bound setter for a key. Does not mutate `shared` (state persists independently of bindings). Chainable. |
| **set** | `(id, value) => this` | Sets value via the bound setter if registered, otherwise writes directly to `shared`. Chainable. |
| **get** | `(id) => value` | Returns the current value from `shared`. |

### 4.2 New: Multi-Key Get with Derivation

Extends `get` to accept an array of keys and an optional transform function, enabling derived state without a new concept:

```js
// Single key (existing behavior)
state.get('price')                         // => 29.99

// Multi-key with derivation
state.get(['price', 'quantity'], (p, q) => p * q)  // => 59.98

// Multi-key without function returns values as array
state.get(['price', 'quantity'])           // => [29.99, 2]
```

Derived values are computed on read — they are not cached or stored. This keeps the model simple: `shared` only contains values that were explicitly `set`. If caching is needed for expensive derivations, it can be handled in userland or addressed in a future optimization pass.

### 4.3 New: Multi-Key Set

Extends `set` to accept an array of keys with a source that produces values for each:

```js
// Single key (existing behavior)
state.set('price', 29.99)

// Multi-key with object
state.set({ price: 29.99, quantity: 2 })

// Derived set — compute a value from other keys and store it
state.set('total', ['price', 'quantity'], (p, q) => p * q)
```

Each key in a multi-key `set` fires its bound setter if one is registered, triggering re-renders in the owning components. React's batching ensures multiple `set` calls within the same event handler or effect are grouped into a single render pass.

### 4.4 New: Namespacing via Join Operator

Scoping is achieved through key naming conventions and a configurable join operator, not through nested instances. The `shared` object stays flat; hierarchy is purely in the key strings.

```js
// Configure join operator (default: '.')
const state = CTGReactState.init({}, {}, { join: '.' });

// Set namespaced values
state.set('sidebar.isOpen', true)
state.set('sidebar.width', 300)

// Get single namespaced value
state.get('sidebar.isOpen')               // => true

// Get all values under a namespace
state.getNamespace('sidebar')             // => { isOpen: true, width: 300 }

// Set all values under a namespace
state.setNamespace('sidebar', { isOpen: false, width: 250 })
```

Namespacing is a convention layer over the flat `shared` object. `getNamespace` filters keys by prefix; `setNamespace` iterates the provided object and calls `set` for each key with the prefix prepended. No nested DistroState instances are required.

### 4.5 New: Export / Import

Serialization of the full `shared` state for persistence, transfer, or snapshot capture:

```js
// Export current state as a plain object
const snapshot = state.export()            // => { price: 29.99, quantity: 2, ... }

// Import state from a plain object
state.import(snapshot)
```

`export()` returns a shallow copy of `shared`. `import(snapshot)` iterates the snapshot's keys and calls `set` for each, firing bound setters and triggering re-renders in registered components. If a key in the snapshot has no bound setter (component not mounted), the value is written directly to `shared` and will be picked up when a component registers for that key.

This means any future middleware or transforms on `set` automatically apply to imported state. Import is not a backdoor — it goes through the same path as any other state mutation.

### 4.6 New: Middleware on Set

An optional transform pipeline that runs before values are written. Middleware functions receive the key, the new value, and the current value, and return the value to write (or throw to reject the mutation):

```js
// Add logging middleware
state.use((id, nextValue, prevValue) => {
  console.log(`${id}: ${prevValue} → ${nextValue}`);
  return nextValue;
});

// Add validation middleware
state.use((id, nextValue, prevValue) => {
  if (id === 'quantity' && nextValue < 0) {
    throw new Error('Quantity cannot be negative');
  }
  return nextValue;
});
```

Middleware is called in registration order. Each middleware receives the value returned by the previous one. This is the interception point for logging, validation, transformation, persistence, and any other cross-cutting concern.

Middleware is optional. If none is registered, `set` writes directly with zero overhead.

### 4.7 New: Strict Mode

An optional mode where `set` only accepts mutations through registered transform functions rather than raw values. This provides enforced mutation patterns for teams that want Redux-style discipline without the boilerplate:

```js
const state = CTGReactState.init({}, {}, { strict: true });

// Register a named mutator
state.mutator('incrementQuantity', (shared) => ({
  quantity: shared.quantity + 1
}));

// In strict mode, raw set is rejected
state.set('quantity', 5)                   // throws: direct set not allowed in strict mode

// Mutations go through named mutators
state.mutate('incrementQuantity')          // works: quantity goes from 2 to 3
```

Strict mode is opt-in. Teams that want simplicity leave it off and use `set` directly. Teams that want enforced patterns turn it on. The mutator registry is separate from the state registry — mutators operate on `shared` and return the keys/values to update.

---

## 5. Snapshot & Time-Travel (CTGReactStateSnapshot)

### 5.1 Design

CTGReactStateSnapshot is a separate class that stores serialized copies of a CTGReactState instance's `shared` object. It interacts with CTGReactState only through `export()` and `import()`, making it loosely coupled and independently testable.

### 5.2 API

| Method | Signature | Description |
|--------|-----------|-------------|
| **constructor** | `(stateInstance) => this` | Binds to a CTGReactState instance for export/import. |
| **save** | `(key?) => this` | Snapshots the current `shared` state. Key defaults to an auto-incrementing index. Chainable. |
| **restore** | `(key) => this` | Imports a previously saved snapshot back into the bound CTGReactState instance. Chainable. |
| **list** | `() => string[]` | Returns available snapshot keys in order. |
| **back** | `() => this` | Moves cursor to the previous snapshot and restores it. For time-travel. Chainable. |
| **forward** | `() => this` | Moves cursor to the next snapshot and restores it. For time-travel. Chainable. |
| **current** | `() => key` | Returns the key of the current cursor position. |
| **clear** | `() => this` | Removes all stored snapshots and resets the cursor. Chainable. |

### 5.3 Storage Model

Snapshots are stored in memory by default as plain objects (shallow copies of `shared`). The storage backend is pluggable — an optional `storage` parameter on the constructor accepts any object implementing `save(key, data)`, `load(key)`, `list()`, and `remove(key)`. This allows snapshots to be persisted to localStorage, sessionStorage, IndexedDB, or a remote server without changing the snapshot API.

### 5.4 Automatic Snapshots

CTGReactStateSnapshot can optionally be wired into CTGReactState's middleware pipeline to capture a snapshot on every `set` call:

```js
const state = CTGReactState.init();
const snapshots = new CTGReactStateSnapshot(state, { auto: true });

// Every set() now saves a snapshot before writing
state.set('quantity', 5);    // snapshot saved, then value written
state.set('quantity', 10);   // another snapshot saved, then value written

snapshots.back();            // quantity restored to 5
snapshots.back();            // quantity restored to initial value
```

Automatic snapshotting uses the middleware hook on `set`, so it respects the same pipeline as logging, validation, and other middleware. A `maxHistory` option limits the number of retained snapshots to prevent unbounded memory growth.

---

## 6. React Integration (CTGReactStateProvider)

### 6.1 Provider

```tsx
import { CTGReactStateProvider } from 'ctg-react-state';

function App() {
  return (
    <CTGReactStateProvider state={{ count: 0, theme: 'light' }}>
      <YourApp />
    </CTGReactStateProvider>
  );
}
```

The provider creates a CTGReactState instance and makes it available via React context. The optional `state` prop pre-populates `shared` with initial values that will be available to components before they register.

### 6.2 Hooks

| Hook | Signature | Description |
|------|-----------|-------------|
| **useDistroState** | `() => CTGReactState` | Returns the CTGReactState instance from context. For direct access to the full API. |
| **useDistroStateRegistry** | `(id) => CTGReactState` | Registers the calling component's `useState` for the given key. Handles registration on mount and unregistration on unmount. Returns the CTGReactState instance. |

### 6.3 Registration Lifecycle

When `useDistroStateRegistry(id)` is called:

1. The hook reads the current value from `shared[id]` (if it exists) to initialize the local `useState`.
2. On mount, it calls `register(id, [value, setter])` to bind the component's state to the registry.
3. On unmount, it calls `unregister(id)` to remove the binding. The value persists in `shared` so it survives component unmount/remount cycles.
4. When the local state changes (via React re-render), the effect re-runs and re-registers with the updated value, keeping `shared[id]` in sync.

### 6.4 Multiple Providers (Scoping)

Multiple `CTGReactStateProvider` instances can be nested. Each creates its own CTGReactState instance with its own `shared` namespace. Components register into whichever provider is nearest in the tree. This provides natural scoping without any special API — a sidebar's provider is independent of the main content's provider.

For cases where a nested scope needs access to a parent scope, the `useDistroState` hook can accept an optional scope identifier to reach a specific provider rather than the nearest one.

---

## 7. Comparison with Redux

### 7.1 Feature Parity

| Capability | Redux | ctg-react-state | Mechanism |
|-----------|-------|-----------------|-----------|
| Cross-component state | Global store + `useSelector` | Registry + `useDistroStateRegistry` | Bound `useState` setters |
| Serializable state | Single store object | `export()` / `import()` | Shallow copy of `shared` |
| Time-travel debugging | Redux DevTools + action replay | CTGReactStateSnapshot `back`/`forward` | Snapshot stack |
| Middleware | `applyMiddleware` chain | `use()` pipeline on `set` | Transform functions |
| Derived state | `reselect` / selectors | `get(keys, fn)` | Computed on read |
| Namespacing | `combineReducers` | Join operator on keys | String prefix convention |
| Enforced mutation patterns | Actions + reducers | Strict mode + named mutators | Opt-in discipline |
| Async side effects | Thunks / sagas / observables | Normal `async/await` + `set` | No special abstraction needed |

### 7.2 What Redux Has That ctg-react-state Does Not

- **DevTools browser extension:** Redux DevTools provides a rich UI for inspecting state, viewing action history, and jumping between states. ctg-react-state would need its own DevTools integration or an in-app debug panel. The data model (snapshots, shared state) supports this; the UI does not yet exist.
- **Ecosystem of plugins:** redux-persist, redux-saga, redux-observable, RTK Query, and hundreds of community packages. ctg-react-state trades ecosystem breadth for simplicity.
- **Community mindshare:** Redux is a known quantity in hiring, onboarding, and Stack Overflow answers. This is a non-technical gap but a real one for enterprise adoption.

### 7.3 What ctg-react-state Has That Redux Does Not

- **Zero-concept async:** No thunks, sagas, or observables. Async is just JavaScript.
- **React-native reactivity:** State lives in `useState`, not an external store. No syncing, no `useSelector` re-render optimization, no `shallowEqual` comparisons.
- **Incremental complexity:** Start with `register`/`get`/`set`. Add snapshots when you need debugging. Add middleware when the team scales. Add strict mode when you want discipline. You never pay for features you don't use.
- **Minimal API surface:** The entire core API is fewer than 10 methods. Redux Toolkit's `configureStore` alone accepts more configuration options than ctg-react-state's total API.

---

## 8. Async Side Effects

This section exists to explicitly document what ctg-react-state does *not* need to build.

Redux requires thunks, sagas, or observables because its core is synchronous: reducers are pure `(state, action) => newState` functions with no room for side effects. Any async work must happen outside the reducer and dispatch results back in. This created an entire category of middleware tooling.

ctg-react-state has no synchronous boundary to work around. A component (or any code with access to the CTGReactState instance) can perform async work and call `set` when results are available:

```js
async function fetchAndUpdateUser(state, userId) {
  const response = await fetch(`/api/users/${userId}`);
  const user = await response.json();
  state.set('currentUser', user);
}
```

There is no dispatch, no action creator, no reducer, and no middleware required. The `set` call fires the bound React setter, which triggers a re-render. Error handling is standard try/catch. Retry logic is a loop. Cancellation is an AbortController. These are all standard JavaScript patterns that require no library-specific abstraction.

If a team wants to centralize async patterns for consistency, they can write plain functions that accept the CTGReactState instance and encapsulate the fetch/set logic. These are just functions — no generators, no effect creators, no special registration.

---

## 9. Connection to ctg-react-test

ctg-react-state and ctg-react-test are companion libraries. The state management layer provides natural integration points for the testing framework:

- **Snapshot as test fixture:** `export()` can capture application state at any point. That snapshot can be loaded in a test via `import()` to establish a known starting state for a pipeline.
- **State assertions in pipelines:** ctg-react-test assert steps can call `get()` on the CTGReactState instance to inspect state without querying the DOM.
- **Time-travel in tests:** CTGReactStateSnapshot's `back()`/`forward()` can be used as pipeline stages to test how components respond to state changes.
- **Reusable state fragments:** Named state configurations can be defined once and imported into test pipelines across multiple test files, reducing setup duplication.

---

## 10. Open Questions & Future Considerations

1. **Computed state caching:** Derived values from `get(keys, fn)` are computed on every call. Should the library optionally memoize derivations based on input key values, and if so, what invalidation strategy should be used?
2. **Selector optimization:** When a component only cares about one derived value, it still re-renders when *any* key in its dependency array changes. Should the library provide a `useSelector`-style hook that only triggers re-renders when the derived value actually changes?
3. **DevTools:** Should the library ship a browser DevTools extension, an in-app debug panel, or both? The snapshot data model supports either approach.
4. **Server-side rendering:** `shared` state needs to be serializable and transferable from server to client for SSR hydration. `export()`/`import()` provides the mechanism, but the provider needs to accept serialized state from the server render.
5. **React Server Components:** RSCs cannot use hooks. How should ctg-react-state interact with the RSC/client component boundary? The registry is inherently client-side, but `shared` values could be passed as props from server components.
6. **Testing the library itself:** ctg-react-test is the natural framework for testing ctg-react-state. This creates a circular development dependency — which library is built first? The core of ctg-react-state can be tested standalone; the React integration layer would benefit from ctg-react-test's pipeline model.
7. **Re-registration optimization:** In the current distro-state design, `useDistroStateRegistry` re-registers on every state change because the state value is in the effect's dependency array. Should ctg-react-state optimize this to register only on mount and use a ref for the current value?
8. **Persistence adapters:** Should the library ship built-in adapters for common persistence targets (localStorage, sessionStorage, IndexedDB), or leave this to the pluggable storage backend on CTGReactStateSnapshot?
9. **Batched set:** When calling `set` on multiple keys in sequence, each call fires its bound setter independently. Should the library provide an explicit `batch()` method, or rely entirely on React's built-in batching (which covers most cases in React 18+)?

---

## 11. Package Structure

```
ctg-react-state/
  packages/
    core/                    # CTGReactState class
                             # Zero dependencies. Usable standalone outside React.
    snapshot/                # CTGReactStateSnapshot class
                             # Depends only on core (via export/import interface).
    react/                   # CTGReactStateProvider, useDistroState, useDistroStateRegistry
                             # Peer dep: react
    devtools/                # Debug panel or DevTools extension (future)
                             # Peer deps: react, core
```

---

## 12. Compatibility Requirements

- JavaScript (ES2020+)
- React >= 18 (required for automatic batching of `setState` calls)
- No other runtime dependencies
- ESM-first with CJS compatibility via dual exports
- Node.js >= 18 (for SSR use cases)

---

*End of document — ctg-react-state Requirements & Design Considerations*
