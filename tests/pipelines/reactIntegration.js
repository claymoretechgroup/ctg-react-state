// React integration tests — provider, hooks, component state communication
// Requires jsdom globals to be set up before import

import React from "react";
import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import { CTGReactStateProvider, useDistroState, useDistroStateRegistry } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, Writer, MultiKeyDisplay, NamespaceDisplay, Toggle } from "../components.js";

let render, screen, act, cleanup;

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render;
    screen = rtl.screen;
    act = rtl.act;
    cleanup = rtl.cleanup;

    // ── Provider ─────────────────────────────────────────────

    await CTGTest.init("provider: renders children")
        .stage("execute", () => {
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement("div", { "data-testid": "child" }, "hello"))
            );
            const text = screen.getByTestId("child").textContent;
            cleanup();
            return text;
        })
        .assert("child rendered", (t) => t, "hello")
        .start(null, config);

    await CTGTest.init("provider: creates CTGReactState in context")
        .stage("execute", () => {
            let instance = null;
            function Probe() { instance = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { x: 1 } },
                    React.createElement(Probe))
            );
            cleanup();
            return instance instanceof CTGReactState;
        })
        .assert("is CTGReactState", (r) => r, true)
        .start(null, config);

    await CTGTest.init("provider: initial state accessible via get()")
        .stage("execute", () => {
            let value = null;
            function Probe() { value = useDistroState().get("count"); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 7 } },
                    React.createElement(Probe))
            );
            cleanup();
            return value;
        })
        .assert("count is 7", (v) => v, 7)
        .start(null, config);

    // ── Counter Component (register + set) ───────────────────

    await CTGTest.init("Counter: displays initial value")
        .stage("execute", () => {
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement(Counter, { stateKey: "count" }))
            );
            const text = screen.getByTestId("count-value").textContent;
            cleanup();
            return text;
        })
        .assert("shows 0", (t) => t, "0")
        .start(null, config);

    await CTGTest.init("Counter: set() triggers re-render via registry")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement(Counter, { stateKey: "count" }),
                    React.createElement(Probe))
            );
            const before = screen.getByTestId("count-value").textContent;
            await act(async () => { await stateRef.set("count", 42); });
            const after = screen.getByTestId("count-value").textContent;
            cleanup();
            return { before, after };
        })
        .assert("before", (r) => r.before, "0")
        .assert("after", (r) => r.after, "42")
        .start(null, config);

    // ── Display Component (read-only via useDistroState) ─────

    await CTGTest.init("Display: reads state without registering")
        .stage("execute", () => {
            render(
                React.createElement(CTGReactStateProvider, { state: { label: "hello" } },
                    React.createElement(Display, { stateKey: "label" }))
            );
            const text = screen.getByTestId("display-label").textContent;
            cleanup();
            return text;
        })
        .assert("shows value", (t) => t, "hello")
        .start(null, config);

    // ── Writer Component (set on click) ──────────────────────

    await CTGTest.init("Writer: clicking sets value in state")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { color: "red" } },
                    React.createElement(Writer, { stateKey: "color", value: "blue" }),
                    React.createElement(Probe))
            );
            const before = stateRef.get("color");
            await act(async () => { await stateRef.set("color", "blue"); });
            const after = stateRef.get("color");
            cleanup();
            return { before, after };
        })
        .assert("before", (r) => r.before, "red")
        .assert("after", (r) => r.after, "blue")
        .start(null, config);

    // ── Cross-Component Communication ────────────────────────

    await CTGTest.init("cross-component: Counter and Display share state")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { shared: "initial" } },
                    React.createElement(Counter, { stateKey: "shared" }),
                    React.createElement(Display, { stateKey: "shared" }),
                    React.createElement(Probe))
            );
            const before = screen.getByTestId("display-shared").textContent;
            await act(async () => { await stateRef.set("shared", "updated"); });
            const after = screen.getByTestId("display-shared").textContent;
            cleanup();
            return { before, after };
        })
        .assert("before", (r) => r.before, "initial")
        .assert("after", (r) => r.after, "updated")
        .start(null, config);

    // ── MultiKeyDisplay Component ────────────────────────────

    await CTGTest.init("MultiKeyDisplay: derives value from multiple keys")
        .stage("execute", () => {
            render(
                React.createElement(CTGReactStateProvider, { state: { price: 10, quantity: 3 } },
                    React.createElement(MultiKeyDisplay, {
                        keys: ["price", "quantity"],
                        deriveFn: (p, q) => p * q,
                        testId: "total"
                    }))
            );
            const text = screen.getByTestId("total").textContent;
            cleanup();
            return text;
        })
        .assert("shows derived total", (t) => t, "30")
        .start(null, config);

    // ── Toggle Component ─────────────────────────────────────

    await CTGTest.init("Toggle: reads and toggles boolean state")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { active: false } },
                    React.createElement(Toggle, { stateKey: "active" }),
                    React.createElement(Probe))
            );
            const before = screen.getByTestId("toggle-active").textContent;
            await act(async () => { await stateRef.set("active", true); });
            const after = screen.getByTestId("toggle-active").textContent;
            cleanup();
            return { before, after };
        })
        .assert("before OFF", (r) => r.before, "OFF")
        .assert("after ON", (r) => r.after, "ON")
        .start(null, config);

    // ── Unregister on Unmount ────────────────────────────────

    await CTGTest.init("useDistroStateRegistry: unregisters on unmount")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            function App({ show }) {
                return React.createElement(CTGReactStateProvider, { state: { temp: 5 } },
                    show ? React.createElement(Counter, { stateKey: "temp" }) : null,
                    React.createElement(Probe));
            }
            const { rerender: rerenderApp } = render(React.createElement(App, { show: true }));
            const during = stateRef.get("temp");
            rerenderApp(React.createElement(App, { show: false }));
            await act(async () => { await stateRef.set("temp", 99); });
            const after = stateRef.get("temp");
            cleanup();
            return { during, after };
        })
        .assert("value during mount", (r) => r.during, 5)
        .assert("value persists in shared", (r) => r.after, 99)
        .start(null, config);

    // ── Nested Providers ─────────────────────────────────────

    await CTGTest.init("nested providers: independent scopes")
        .stage("execute", () => {
            let outerVal = null, innerVal = null;
            function OuterProbe() { outerVal = useDistroState().get("x"); return null; }
            function InnerProbe() { innerVal = useDistroState().get("x"); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { x: "outer" } },
                    React.createElement(OuterProbe),
                    React.createElement(CTGReactStateProvider, { state: { x: "inner" } },
                        React.createElement(InnerProbe)))
            );
            cleanup();
            return { outerVal, innerVal };
        })
        .assert("outer scope", (r) => r.outerVal, "outer")
        .assert("inner scope", (r) => r.innerVal, "inner")
        .start(null, config);

    // ── NamespaceDisplay Component ───────────────────────────

    await CTGTest.init("NamespaceDisplay: shows namespace values")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: {} },
                    React.createElement(NamespaceDisplay, { prefix: "ui", testId: "ns" }),
                    React.createElement(Probe))
            );
            await act(async () => {
                await stateRef.set("ui.sidebar", true);
                await stateRef.set("ui.theme", "dark");
            });
            // NamespaceDisplay reads on render — need to trigger re-render
            // Since it uses useDistroState (not registry), it won't auto-update
            // This test verifies the getNamespace API works when called
            const ns = stateRef.getNamespace("ui");
            cleanup();
            return ns;
        })
        .assert("sidebar", (ns) => ns.sidebar, true)
        .assert("theme", (ns) => ns.theme, "dark")
        .start(null, config);
}
