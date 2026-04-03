// Strict mode and mutator tests

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import CTGReactStateError from "../../src/CTGReactStateError.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    await CTGTest.init("strict: raw set throws STRICT_VIOLATION")
        .stage("attempt", async () => {
            const s = CTGReactState.init({}, {}, { strict: true });
            try { await s.set("x", 1); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "STRICT_VIOLATION" ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("strict: multi-key set throws STRICT_VIOLATION")
        .stage("attempt", async () => {
            const s = CTGReactState.init({}, {}, { strict: true });
            try { await s.set({ x: 1 }); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "STRICT_VIOLATION" ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("strict: derived set throws STRICT_VIOLATION")
        .stage("attempt", async () => {
            const s = CTGReactState.init({ a: 1, b: 2 }, {}, { strict: true });
            try { await s.set("total", ["a", "b"], (a, b) => a + b); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "STRICT_VIOLATION" ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("strict: mutate() works with named mutator")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 }, {}, { strict: true });
            s.mutator("increment", (shared) => ({ count: shared.count + 1 }));
            await s.mutate("increment");
            return s.get("count");
        })
        .assert("count incremented", (v) => v, 1)
        .start(null, config);

    await CTGTest.init("strict: mutate() with payload")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 }, {}, { strict: true });
            s.mutator("add", (shared, amount) => ({ count: shared.count + amount }));
            await s.mutate("add", 5);
            return s.get("count");
        })
        .assert("count is 5", (v) => v, 5)
        .start(null, config);

    await CTGTest.init("strict: unknown mutator throws UNKNOWN_MUTATOR")
        .stage("attempt", async () => {
            const s = CTGReactState.init({}, {}, { strict: true });
            try { await s.mutate("nonexistent"); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "UNKNOWN_MUTATOR" ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("strict: mutator() is chainable")
        .stage("check", () => {
            const s = CTGReactState.init({}, {}, { strict: true });
            return s.mutator("x", () => ({})) === s;
        })
        .assert("returns self", (r) => r, true)
        .start(null, config);

    await CTGTest.init("non-strict: mutate() still works voluntarily")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            s.mutator("increment", (shared) => ({ count: shared.count + 1 }));
            await s.mutate("increment");
            return s.get("count");
        })
        .assert("count incremented", (v) => v, 1)
        .start(null, config);

    await CTGTest.init("strict: mutate fires bound setters")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 }, {}, { strict: true });
            let firedVal = null;
            s.register("count", [0, (v) => { firedVal = v; }]);
            s.mutator("set5", () => ({ count: 5 }));
            await s.mutate("set5");
            return firedVal;
        })
        .assert("setter fired with 5", (v) => v, 5)
        .start(null, config);

    await CTGTest.init("strict: mutate goes through middleware")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 }, {}, { strict: true });
            s.use((id, val) => val * 10);
            s.mutator("set5", () => ({ count: 5 }));
            await s.mutate("set5");
            return s.get("count");
        })
        .assert("middleware applied", (v) => v, 50)
        .start(null, config);
}
