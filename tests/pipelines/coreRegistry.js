// CTGReactState core registry tests — init, register, unregister, get, set

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import CTGReactStateError from "../../src/CTGReactStateError.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    // ── Construction ─────────────────────────────────────────

    await CTGTest.init("init: static factory returns instance")
        .stage("create", () => CTGReactState.init())
        .assert("is instance", (s) => s instanceof CTGReactState, true)
        .start(null, config);

    await CTGTest.init("init: with initial shared state")
        .stage("create", () => CTGReactState.init({ count: 0, name: "test" }))
        .assert("count", (s) => s.get("count"), 0)
        .assert("name", (s) => s.get("name"), "test")
        .start(null, config);

    await CTGTest.init("init: with config")
        .stage("create", () => CTGReactState.init({}, {}, { join: "/", strict: false }))
        .assert("join", (s) => s.join, "/")
        .assert("strict", (s) => s.strict, false)
        .start(null, config);

    await CTGTest.init("init: default join is dot")
        .stage("create", () => CTGReactState.init())
        .assert("join", (s) => s.join, ".")
        .start(null, config);

    await CTGTest.init("init: default strict is false")
        .stage("create", () => CTGReactState.init())
        .assert("strict", (s) => s.strict, false)
        .start(null, config);

    // ── Register / Unregister ────────────────────────────────

    await CTGTest.init("register: captures value into shared")
        .stage("setup", () => {
            const s = CTGReactState.init();
            let localVal = 42;
            s.register("count", [localVal, (v) => { localVal = v; }]);
            return s;
        })
        .assert("get returns registered value", (s) => s.get("count"), 42)
        .start(null, config);

    await CTGTest.init("register: bound setter fires on set")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            let localVal = 0;
            s.register("count", [localVal, (v) => { localVal = v; }]);
            await s.set("count", 10);
            return localVal;
        })
        .assert("setter fired", (v) => v, 10)
        .start(null, config);

    await CTGTest.init("register: chainable")
        .stage("check", () => {
            const s = CTGReactState.init();
            return s.register("a", [1, () => {}]) === s;
        })
        .assert("returns self", (r) => r, true)
        .start(null, config);

    await CTGTest.init("unregister: removes setter but keeps shared value")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            let called = false;
            s.register("count", [5, () => { called = true; }]);
            s.unregister("count");
            await s.set("count", 99);
            return { value: s.get("count"), called };
        })
        .assert("value updated in shared", (r) => r.value, 99)
        .assert("setter not called", (r) => r.called, false)
        .start(null, config);

    await CTGTest.init("unregister: chainable")
        .stage("check", () => {
            const s = CTGReactState.init();
            s.register("a", [1, () => {}]);
            return s.unregister("a") === s;
        })
        .assert("returns self", (r) => r, true)
        .start(null, config);

    // ── Get / Set ────────────────────────────────────────────

    await CTGTest.init("get: returns undefined for missing key")
        .assert("missing", () => CTGReactState.init().get("nope"), undefined)
        .start(null, config);

    await CTGTest.init("set: writes to shared without binding")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            await s.set("key", "value");
            return s.get("key");
        })
        .assert("value stored", (v) => v, "value")
        .start(null, config);

    await CTGTest.init("set: chainable via await")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            const result = await s.set("a", 1);
            return result === s;
        })
        .assert("returns self", (r) => r, true)
        .start(null, config);

    // ── Key Validation ───────────────────────────────────────

    await CTGTest.init("set: rejects __proto__ key")
        .stage("attempt", async () => {
            try { await CTGReactState.init().set("__proto__", {}); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "INVALID_KEY" ? "threw" : "wrong"; }
        })
        .assert("threw INVALID_KEY", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("set: rejects constructor key")
        .stage("attempt", async () => {
            try { await CTGReactState.init().set("constructor", {}); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "INVALID_KEY" ? "threw" : "wrong"; }
        })
        .assert("threw INVALID_KEY", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("set: rejects prototype key")
        .stage("attempt", async () => {
            try { await CTGReactState.init().set("prototype", {}); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "INVALID_KEY" ? "threw" : "wrong"; }
        })
        .assert("threw INVALID_KEY", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("set: rejects empty string key")
        .stage("attempt", async () => {
            try { await CTGReactState.init().set("", 1); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "INVALID_KEY" ? "threw" : "wrong"; }
        })
        .assert("threw INVALID_KEY", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("register: rejects invalid binding")
        .stage("attempt", () => {
            try { CTGReactState.init().register("x", "not an array"); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "INVALID_BINDING" ? "threw" : "wrong"; }
        })
        .assert("threw INVALID_BINDING", (r) => r, "threw")
        .start(null, config);

    // ── Export / Import ──────────────────────────────────────

    await CTGTest.init("export: returns shallow copy of shared")
        .stage("setup", async () => {
            const s = CTGReactState.init({ a: 1, b: 2 });
            await s.set("c", 3);
            const exp = s.export();
            return { exp, isShallow: exp !== s._shared };
        })
        .assert("has all keys", (r) => r.exp.a === 1 && r.exp.b === 2 && r.exp.c === 3, true)
        .assert("is copy not reference", (r) => r.isShallow, true)
        .start(null, config);

    await CTGTest.init("import: sets each key through set()")
        .stage("setup", async () => {
            const s = CTGReactState.init({ a: 1 });
            let setCalled = 0;
            s.use((id, val, prev) => { setCalled++; return val; });
            await s.import({ a: 10, b: 20 });
            return { a: s.get("a"), b: s.get("b"), setCalled };
        })
        .assert("a updated", (r) => r.a, 10)
        .assert("b created", (r) => r.b, 20)
        .assert("middleware fired for each", (r) => r.setCalled, 2)
        .start(null, config);

    await CTGTest.init("import: rejects __proto__ in snapshot")
        .stage("attempt", async () => {
            try { await CTGReactState.init().import({ "__proto__": {} }); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("import: transactional rollback on middleware failure")
        .stage("setup", async () => {
            const s = CTGReactState.init({ x: "original" });
            s.use((id, val) => {
                if (id === "y" && val === "bad") throw new Error("reject y");
                return val;
            });
            try {
                await s.import({ x: "changed", y: "bad" });
            } catch { /* expected */ }
            return s.get("x");
        })
        .assert("x rolled back", (r) => r, "original")
        .start(null, config);
}
