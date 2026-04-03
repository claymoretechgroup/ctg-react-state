// Middleware pipeline tests — sync, async, ordering, rejection, side effects

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import CTGReactStateError from "../../src/CTGReactStateError.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    await CTGTest.init("middleware: sync middleware transforms value")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            s.use((id, val) => val * 2);
            await s.set("x", 5);
            return s.get("x");
        })
        .assert("value doubled", (v) => v, 10)
        .start(null, config);

    await CTGTest.init("middleware: async middleware awaited")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            s.use(async (id, val) => {
                await new Promise((r) => setTimeout(r, 10));
                return val + 1;
            });
            await s.set("x", 5);
            return s.get("x");
        })
        .assert("value incremented", (v) => v, 6)
        .start(null, config);

    await CTGTest.init("middleware: called in registration order")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            const order = [];
            s.use((id, val) => { order.push("first"); return val; });
            s.use((id, val) => { order.push("second"); return val; });
            s.use((id, val) => { order.push("third"); return val; });
            await s.set("x", 1);
            return order;
        })
        .assert("order", (o) => JSON.stringify(o), JSON.stringify(["first", "second", "third"]))
        .start(null, config);

    await CTGTest.init("middleware: receives id, nextValue, prevValue")
        .stage("setup", async () => {
            const s = CTGReactState.init({ x: "old" });
            let received = {};
            s.use((id, next, prev) => { received = { id, next, prev }; return next; });
            await s.set("x", "new");
            return received;
        })
        .assert("id", (r) => r.id, "x")
        .assert("next", (r) => r.next, "new")
        .assert("prev", (r) => r.prev, "old")
        .start(null, config);

    await CTGTest.init("middleware: chained transforms pass value through")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            s.use((id, val) => val + 10);
            s.use((id, val) => val * 2);
            await s.set("x", 5);
            return s.get("x");
        })
        .assert("(5+10)*2 = 30", (v) => v, 30)
        .start(null, config);

    await CTGTest.init("middleware: rejection prevents write")
        .stage("setup", async () => {
            const s = CTGReactState.init({ x: "original" });
            s.use((id, val) => { throw new Error("rejected"); });
            try { await s.set("x", "bad"); } catch { /* expected */ }
            return s.get("x");
        })
        .assert("value unchanged", (v) => v, "original")
        .start(null, config);

    await CTGTest.init("middleware: rejection throws MIDDLEWARE_ERROR")
        .stage("attempt", async () => {
            const s = CTGReactState.init();
            s.use(() => { throw new Error("boom"); });
            try { await s.set("x", 1); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "MIDDLEWARE_ERROR" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw MIDDLEWARE_ERROR", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("middleware: no middleware means zero overhead")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            await s.set("x", 42);
            return s.get("x");
        })
        .assert("value set directly", (v) => v, 42)
        .start(null, config);

    await CTGTest.init("middleware: use() is chainable")
        .stage("check", () => {
            const s = CTGReactState.init();
            return s.use(() => {}) === s;
        })
        .assert("returns self", (r) => r, true)
        .start(null, config);

    // ── Side Effects During Failed Import ────────────────────

    await CTGTest.init("middleware: side effects not rolled back on import failure")
        .stage("setup", async () => {
            const sideEffects = [];
            const s = CTGReactState.init({ a: 1, b: 2 });
            s.use((id, val) => {
                sideEffects.push(`${id}=${val}`);
                if (id === "b" && val === "bad") throw new Error("reject");
                return val;
            });
            try { await s.import({ a: 10, b: "bad" }); } catch { /* expected */ }
            return { effects: sideEffects, aVal: s.get("a") };
        })
        .assert("side effect for a recorded", (r) => r.effects.includes("a=10"), true)
        .assert("side effect for b recorded", (r) => r.effects.includes("b=bad"), true)
        .assert("a rolled back in memory", (r) => r.aVal, 1)
        .start(null, config);

    // ── Stress Test ──────────────────────────────────────────

    await CTGTest.init("middleware: large import performance")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            const snapshot = {};
            for (let i = 0; i < 1000; i++) { snapshot[`key${i}`] = i; }
            const start = Date.now();
            await s.import(snapshot);
            const elapsed = Date.now() - start;
            return { count: Object.keys(s.export()).length, elapsed };
        })
        .assert("all keys imported", (r) => r.count, 1000)
        .assert("under 5 seconds", (r) => r.elapsed < 5000, true)
        .start(null, config);
}
