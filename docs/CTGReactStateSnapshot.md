# CTGReactStateSnapshot

Snapshot storage and time-travel for CTGReactState. Loosely coupled via `export()`/`import()` interface.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| _state | ctgReactState | Bound state instance |
| _snapshots | OBJECT | In-memory snapshot storage |
| _order | [STRING] | Ordered snapshot keys |
| _cursor | INT | Current position (-1 = no position) |
| _storage | OBJECT\|NULL | Optional pluggable storage backend |
| _maxHistory | INT\|NULL | Maximum retained snapshots |
| _auto | BOOL | Auto-snapshot on every set() |

---

### CONSTRUCTOR :: ctgReactState, OBJECT? -> ctgReactStateSnapshot

Binds to a state instance. Options: `{ storage?, maxHistory?, auto? }`. If `auto` is true, registers middleware to capture snapshots before every set().

```javascript
const snapshots = new CTGReactStateSnapshot(state, { auto: true, maxHistory: 50 });
```

---

### ctgReactStateSnapshot.save :: STRING? -> PROMISE(this)

Saves current state. Key defaults to auto-incrementing index. Trims to maxHistory. Chainable via await.

---

### ctgReactStateSnapshot.restore :: STRING -> PROMISE(this)

Restores a saved snapshot via import(). Sets cursor position. Throws `SNAPSHOT_NOT_FOUND` for unknown keys. Chainable via await.

---

### ctgReactStateSnapshot.list :: VOID -> PROMISE([STRING])

Returns snapshot keys in insertion order.

---

### ctgReactStateSnapshot.back :: VOID -> PROMISE(this)

Moves cursor back and restores. No-op at beginning. Chainable via await.

---

### ctgReactStateSnapshot.forward :: VOID -> PROMISE(this)

Moves cursor forward and restores. No-op at end. Chainable via await.

---

### ctgReactStateSnapshot.current :: VOID -> STRING|NULL

Returns key at current cursor position, or null.

---

### ctgReactStateSnapshot.clear :: VOID -> PROMISE(this)

Removes all snapshots (including storage backend keys) and resets cursor. Chainable via await.

---

### Pluggable Storage Interface

Any object implementing (all may be sync or async):

```javascript
async save(key, data)
async load(key)
async list()
async remove(key)
```
