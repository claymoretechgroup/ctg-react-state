# CTGReactStateError

Typed error class with bidirectional name/code lookup.

Import from the package root:

```javascript
import { CTGReactStateError } from "ctg-react-state";
```

### Error Codes

| Code | Type | Description |
|------|------|-------------|
| 1000 | INVALID_KEY | Key is empty, non-string, or reserved (__proto__, constructor, prototype) |
| 1001 | STRICT_VIOLATION | Direct set in strict mode |
| 1002 | UNKNOWN_MUTATOR | mutate() called with unregistered name |
| 1003 | MIDDLEWARE_ERROR | Middleware threw during set pipeline |
| 1004 | INVALID_MUTATOR | mutator() fn is not a function, or mutator returned non-object |
| 2000 | SNAPSHOT_NOT_FOUND | restore() with unknown snapshot key |
| 2001 | SNAPSHOT_ERROR | Storage backend operation failed |
| 3000 | INVALID_BINDING | register() with invalid [value, setter] pair |
| 3001 | INVALID_CONFIG | Invalid constructor config |

---

### CONSTRUCTOR :: STRING|INT, STRING?, * -> ctgReactStateError

Creates a typed error from name or code. Unknown types throw TypeError.

```javascript
throw new CTGReactStateError("STRICT_VIOLATION", "Direct set not allowed");
```

---

### CTGReactStateError.lookup :: STRING|INT -> INT|STRING|NULL

Bidirectional lookup. Returns null if not found.

```javascript
CTGReactStateError.lookup("STRICT_VIOLATION"); // 1001
CTGReactStateError.lookup(1001);               // "STRICT_VIOLATION"
```
