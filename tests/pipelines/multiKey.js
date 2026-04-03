// Multi-key get/set and derived operations tests

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    // ── Multi-Key Get ────────────────────────────────────────

    await CTGTest.init("get: array of keys returns array of values")
        .stage("setup", () => CTGReactState.init({ price: 29.99, quantity: 2 }))
        .assert("values", (s) => JSON.stringify(s.get(["price", "quantity"])),
            JSON.stringify([29.99, 2]))
        .start(null, config);

    await CTGTest.init("get: array with derivation function")
        .stage("setup", () => CTGReactState.init({ price: 29.99, quantity: 2 }))
        .assert("derived", (s) => s.get(["price", "quantity"], (p, q) => p * q), 59.98)
        .start(null, config);

    await CTGTest.init("get: array with missing key returns undefined in array")
        .stage("setup", () => CTGReactState.init({ a: 1 }))
        .assert("values", (s) => JSON.stringify(s.get(["a", "missing"])),
            JSON.stringify([1, undefined]))
        .start(null, config);

    // ── Multi-Key Set ────────────────────────────────────────

    await CTGTest.init("set: object sets multiple keys")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            await s.set({ price: 29.99, quantity: 2 });
            return { price: s.get("price"), quantity: s.get("quantity") };
        })
        .assert("price", (r) => r.price, 29.99)
        .assert("quantity", (r) => r.quantity, 2)
        .start(null, config);

    await CTGTest.init("set: object fires bound setters for each key")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            const fired = [];
            s.register("a", [0, (v) => fired.push(["a", v])]);
            s.register("b", [0, (v) => fired.push(["b", v])]);
            await s.set({ a: 10, b: 20 });
            return fired;
        })
        .assert("both fired", (f) => f.length, 2)
        .assert("a value", (f) => f[0][1], 10)
        .assert("b value", (f) => f[1][1], 20)
        .start(null, config);

    // ── Derived Set ──────────────────────────────────────────

    await CTGTest.init("set: derived set computes from deps")
        .stage("setup", async () => {
            const s = CTGReactState.init({ price: 10, quantity: 3 });
            await s.set("total", ["price", "quantity"], (p, q) => p * q);
            return s.get("total");
        })
        .assert("total computed", (v) => v, 30)
        .start(null, config);

    await CTGTest.init("set: derived set fires bound setter")
        .stage("setup", async () => {
            const s = CTGReactState.init({ price: 10, quantity: 3 });
            let totalVal = 0;
            s.register("total", [0, (v) => { totalVal = v; }]);
            await s.set("total", ["price", "quantity"], (p, q) => p * q);
            return totalVal;
        })
        .assert("setter fired with computed value", (v) => v, 30)
        .start(null, config);
}
