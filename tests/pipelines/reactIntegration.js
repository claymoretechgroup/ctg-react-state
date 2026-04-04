// React integration tests — provider, hooks, component state communication
// Requires jsdom globals to be set up before import
//
// DOM-observable behavior uses CTGReactTest (render/interact/assert).
// Direct API tests that cannot be observed through the DOM use CTGTest.

import React from "react";
import CTGTest from "ctg-js-test";
import CTGReactTest from "ctg-react-test";
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

    // ══════════════════════════════════════════════════════════════
    // DOM-observable tests (CTGReactTest)
    // ══════════════════════════════════════════════════════════════

    // ── Provider ─────────────────────────────────────────────

    await CTGReactTest.init("provider: renders children")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 0 } },
            React.createElement("div", { "data-testid": "child" }, "hello")))
        .assert("child rendered", (ctx) => ctx.screen.getByTestId("child").textContent, "hello")
        .start(null, config);

    await CTGReactTest.init("provider: initial state accessible via component")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 7 } },
            React.createElement(Counter, { stateKey: "count" })))
        .assert("count is 7", (ctx) => ctx.screen.getByTestId("count-value").textContent, "7")
        .start(null, config);

    // ── Counter Component ────────────────────────────────────

    await CTGReactTest.init("Counter: displays initial value")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 0 } },
            React.createElement(Counter, { stateKey: "count" })))
        .assert("shows 0", (ctx) => ctx.screen.getByTestId("count-value").textContent, "0")
        .start(null, config);

    await CTGReactTest.init("Counter: increment via click updates display")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 0 } },
            React.createElement(Counter, { stateKey: "count" })))
        .assert("initial 0", (ctx) => ctx.screen.getByTestId("count-value").textContent, "0")
        .interact("click +", async (ctx) => {
            await ctx.user.click(ctx.screen.getByTestId("count-inc"));
            return ctx;
        })
        .assert("after increment", (ctx) => ctx.screen.getByTestId("count-value").textContent, "1")
        .start(null, config);

    await CTGReactTest.init("Counter: decrement via click updates display")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 5 } },
            React.createElement(Counter, { stateKey: "count" })))
        .assert("initial 5", (ctx) => ctx.screen.getByTestId("count-value").textContent, "5")
        .interact("click -", async (ctx) => {
            await ctx.user.click(ctx.screen.getByTestId("count-dec"));
            return ctx;
        })
        .assert("after decrement", (ctx) => ctx.screen.getByTestId("count-value").textContent, "4")
        .start(null, config);

    // ── Display Component (read-only via useDistroState) ─────

    await CTGReactTest.init("Display: reads state without registering")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { label: "hello" } },
            React.createElement(Display, { stateKey: "label" })))
        .assert("shows value", (ctx) => ctx.screen.getByTestId("display-label").textContent, "hello")
        .start(null, config);

    // ── Writer Component ─────────────────────────────────────

    await CTGReactTest.init("Writer: click updates registered observer")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { color: "red" } },
            React.createElement(Writer, { stateKey: "color", value: "blue" }),
            React.createElement(Counter, { stateKey: "color" })))
        .assert("before", (ctx) => ctx.screen.getByTestId("color-value").textContent, "red")
        .interact("click write", async (ctx) => {
            await ctx.user.click(ctx.screen.getByTestId("write-color"));
            return ctx;
        })
        .assert("after", (ctx) => ctx.screen.getByTestId("color-value").textContent, "blue")
        .start(null, config);

    // ── Cross-Component Communication ────────────────────────

    // ── Cross-Component (registered observer) ──────────────────
    // Tests that set() from one component propagates to another registered
    // component. Uses direct API (act + stateRef.set) because the propagation
    // path is internal — the DOM update in the observer is the assertion target,
    // but the trigger must bypass user interaction to isolate the registry path.

    await CTGTest.init("cross-component: set in one updates registered observer")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { shared: 0 } },
                    React.createElement(Counter, { stateKey: "shared" }),
                    React.createElement(Probe))
            );
            try {
                const before = screen.getByTestId("shared-value").textContent;
                await act(async () => { await stateRef.set("shared", 42); });
                const after = screen.getByTestId("shared-value").textContent;
                return { before, after };
            } finally { cleanup(); }
        })
        .assert("before", (r) => r.before, "0")
        .assert("after", (r) => r.after, "42")
        .start(null, config);

    // ── MultiKeyDisplay Component ────────────────────────────

    await CTGReactTest.init("MultiKeyDisplay: derives value from multiple keys")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { price: 10, quantity: 3 } },
            React.createElement(MultiKeyDisplay, {
                keys: ["price", "quantity"],
                deriveFn: (p, q) => p * q,
                testId: "total"
            })))
        .assert("shows derived total", (ctx) => ctx.screen.getByTestId("total").textContent, "30")
        .start(null, config);

    // ── Toggle Component ─────────────────────────────────────

    await CTGReactTest.init("Toggle: click toggles state")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { active: false } },
            React.createElement(Toggle, { stateKey: "active" })))
        .assert("initial OFF", (ctx) => ctx.screen.getByTestId("toggle-active").textContent, "OFF")
        .interact("click toggle", async (ctx) => {
            await ctx.user.click(ctx.screen.getByTestId("toggle-active"));
            return ctx;
        })
        .assert("after ON", (ctx) => ctx.screen.getByTestId("toggle-active").textContent, "ON")
        .start(null, config);

    // ── Nested Providers ─────────────────────────────────────

    await CTGReactTest.init("nested providers: independent scopes")
        .render("mount", React.createElement(CTGReactStateProvider, { state: { count: 10 } },
            React.createElement(Counter, { stateKey: "count" }),
            React.createElement(CTGReactStateProvider, { state: { count: 99 } },
                React.createElement(Display, { stateKey: "count" }))))
        .assert("outer scope", (ctx) => ctx.screen.getByTestId("count-value").textContent, "10")
        .assert("inner scope", (ctx) => ctx.screen.getByTestId("display-count").textContent, "99")
        .start(null, config);

    // ══════════════════════════════════════════════════════════════
    // Direct API tests (CTGTest)
    // State is accessible through the JS API — no DOM needed.
    // ══════════════════════════════════════════════════════════════

    // ── Unregistered Reader ──────────────────────────────────

    await CTGTest.init("cross-component: unregistered reader sees value via get()")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: { data: "hello" } },
                    React.createElement(Counter, { stateKey: "data" }),
                    React.createElement(Probe))
            );
            try {
                await act(async () => { await stateRef.set("data", "world"); });
                return stateRef.get("data");
            } finally { cleanup(); }
        })
        .assert("get returns updated value", (v) => v, "world")
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
            try {
                const during = stateRef.get("temp");
                rerenderApp(React.createElement(App, { show: false }));
                await act(async () => { await stateRef.set("temp", 99); });
                const after = stateRef.get("temp");
                return { during, after };
            } finally { cleanup(); }
        })
        .assert("value during mount", (r) => r.during, 5)
        .assert("value persists in shared", (r) => r.after, 99)
        .start(null, config);

    // ── Namespace Display ────────────────────────────────────

    await CTGTest.init("NamespaceDisplay: shows namespace values")
        .stage("execute", async () => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                React.createElement(CTGReactStateProvider, { state: {} },
                    React.createElement(NamespaceDisplay, { prefix: "ui", testId: "ns" }),
                    React.createElement(Probe))
            );
            try {
                await act(async () => {
                    await stateRef.set("ui.sidebar", true);
                    await stateRef.set("ui.theme", "dark");
                });
                return stateRef.getNamespace("ui");
            } finally { cleanup(); }
        })
        .assert("sidebar", (ns) => ns.sidebar, true)
        .assert("theme", (ns) => ns.theme, "dark")
        .start(null, config);
}
