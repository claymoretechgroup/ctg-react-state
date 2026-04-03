// Namespacing via join operator tests

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    await CTGTest.init("getNamespace: returns matching keys with prefix stripped")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            await s.set("sidebar.isOpen", true);
            await s.set("sidebar.width", 300);
            await s.set("main.content", "hello");
            return s.getNamespace("sidebar");
        })
        .assert("isOpen", (ns) => ns.isOpen, true)
        .assert("width", (ns) => ns.width, 300)
        .assert("no main", (ns) => ns.content, undefined)
        .start(null, config);

    await CTGTest.init("setNamespace: sets keys with prefix prepended")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            await s.setNamespace("sidebar", { isOpen: false, width: 250 });
            return { isOpen: s.get("sidebar.isOpen"), width: s.get("sidebar.width") };
        })
        .assert("isOpen", (r) => r.isOpen, false)
        .assert("width", (r) => r.width, 250)
        .start(null, config);

    await CTGTest.init("namespace: custom join operator")
        .stage("setup", async () => {
            const s = CTGReactState.init({}, {}, { join: "/" });
            await s.set("ui/sidebar/open", true);
            return s.getNamespace("ui/sidebar");
        })
        .assert("open", (ns) => ns.open, true)
        .start(null, config);

    await CTGTest.init("getNamespace: empty namespace returns empty object")
        .stage("setup", () => CTGReactState.init({ a: 1 }))
        .assert("empty", (s) => JSON.stringify(s.getNamespace("missing")), "{}")
        .start(null, config);

    await CTGTest.init("setNamespace: fires bound setters")
        .stage("setup", async () => {
            const s = CTGReactState.init();
            let fired = false;
            s.register("ns.key", [0, () => { fired = true; }]);
            await s.setNamespace("ns", { key: 42 });
            return fired;
        })
        .assert("setter fired", (r) => r, true)
        .start(null, config);
}
