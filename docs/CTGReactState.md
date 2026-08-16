# CTGReactState

Core state registry. Manages a flat `shared` object of values keyed by ID and bound setter functions. Usable standalone without React.

Import from the package root:

```javascript
import CTGReactState, { CTGReactStateError } from "ctg-react-state";
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| _shared | OBJECT | Flat key/value state store |
| _states | OBJECT | Bound setter functions keyed by ID |
| _middleware | [FUNCTION] | Middleware pipeline for set() |
| _mutators | OBJECT | Named mutator functions (null prototype) |
| _join | STRING | Namespace join operator (default: ".") |
| _strict | BOOL | Strict mode flag |

---

### CTGReactState.init :: OBJECT?, OBJECT?, OBJECT? -> ctgReactState

Static factory. Creates a new instance with optional initial state, pre-bound setters, and config (`{ join?, strict? }`).

```javascript
const state = CTGReactState.init({ count: 0 }, {}, { join: ".", strict: false });
```

---

### ctgReactState.get :: STRING|[STRING], ((* ...) -> *)? -> *|[*]

Single key returns value. Array of keys returns array of values, or applies derivation function.

```javascript
state.get("price");                                    // 29.99
state.get(["price", "quantity"]);                      // [29.99, 2]
state.get(["price", "quantity"], (p, q) => p * q);     // 59.98
```

---

### ctgReactState.set :: STRING|OBJECT, *|[STRING]?, ((* ...) -> *)? -> PROMISE(this)

Overloaded: single key/value, multi-key object, or derived set from dependency keys. Async — middleware pipeline is awaited. Chainable via await.

```javascript
await state.set("price", 29.99);
await state.set({ price: 29.99, quantity: 2 });
await state.set("total", ["price", "quantity"], (p, q) => p * q);
```

---

### ctgReactState.register :: STRING, [*, (* -> VOID)] -> this

Registers a value/setter pair (from React's `useState`). Captures value into shared, stores bound setter. Chainable.

---

### ctgReactState.unregister :: STRING -> this

Removes the bound setter. Value persists in shared. Chainable.

---

### ctgReactState.export :: VOID -> OBJECT

Returns a shallow copy of shared state.

---

### ctgReactState.import :: OBJECT -> PROMISE(this)

Transactional import. Sets each key through the middleware pipeline. Rolls back on failure. Chainable via await.

---

### ctgReactState.use :: (STRING, *, * -> *|PROMISE(*)) -> this

Adds async middleware to the set pipeline. Receives `(id, nextValue, prevValue)`, returns value to write. Chainable.

---

### ctgReactState.getNamespace :: STRING -> OBJECT

Returns key/value pairs under a namespace prefix with prefix stripped.

---

### ctgReactState.setNamespace :: STRING, OBJECT -> PROMISE(this)

Sets each key with namespace prefix prepended. Async. Chainable via await.

---

### ctgReactState.mutator :: STRING, (OBJECT, *? -> OBJECT) -> this

Registers a named mutator function. The mutator receives a deep-frozen clone of shared and optional payload, returns an update object. Chainable.

---

### ctgReactState.mutate :: STRING, *? -> PROMISE(this)

Executes a named mutator. Applies the returned key/value pairs via the middleware pipeline. Async. Chainable via await.
