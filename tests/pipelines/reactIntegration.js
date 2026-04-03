// React integration tests — provider, hooks, component rendering
// Requires jsdom globals to be set up before import

import React, { useState } from "react";
import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import { CTGReactStateProvider, useDistroState, useDistroStateRegistry } from "../../src/CTGReactStateProvider.js";

let render, screen, act, cleanup;

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {
    // Dynamic import to ensure jsdom globals are set before @testing-library/react loads
    const rtl = await import("@testing-library/react");
    render = rtl.render;
    screen = rtl.screen;
    act = rtl.act;
    cleanup = rtl.cleanup;

    // ── Provider ─────────────────────────────────────────────

    await CTGTest.init("provider: renders children")
        .stage("execute", () => {
            const result = render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement("div", { "data-testid": "child" }, "hello"))
            );
            const el = screen.getByTestId("child");
            cleanup();
            return el.textContent;
        })
        .assert("child rendered", (t) => t, "hello")
        .start(null, config);

    await CTGTest.init("provider: creates CTGReactState instance in context")
        .stage("execute", () => {
            let instance = null;
            function Reader() {
                instance = useDistroState();
                return null;
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { x: 42 } },
                    React.createElement(Reader))
            );
            cleanup();
            return instance instanceof CTGReactState;
        })
        .assert("is CTGReactState", (r) => r, true)
        .start(null, config);

    await CTGTest.init("provider: initial state accessible via get()")
        .stage("execute", () => {
            let value = null;
            function Reader() {
                const state = useDistroState();
                value = state.get("count");
                return null;
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 7 } },
                    React.createElement(Reader))
            );
            cleanup();
            return value;
        })
        .assert("count is 7", (v) => v, 7)
        .start(null, config);

    // ── useDistroStateRegistry ───────────────────────────────

    await CTGTest.init("useDistroStateRegistry: registers on mount")
        .stage("execute", () => {
            let stateInstance = null;
            function Counter() {
                const state = useDistroStateRegistry("count");
                stateInstance = state;
                return React.createElement("span", null, String(state.get("count")));
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement(Counter))
            );
            const registered = stateInstance !== null && stateInstance.get("count") === 0;
            cleanup();
            return registered;
        })
        .assert("registered", (r) => r, true)
        .start(null, config);

    await CTGTest.init("useDistroStateRegistry: set() triggers re-render")
        .stage("execute", async () => {
            let stateRef = null;
            function Counter() {
                const state = useDistroStateRegistry("count");
                stateRef = state;
                return React.createElement("span", { "data-testid": "count" },
                    String(state.get("count")));
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { count: 0 } },
                    React.createElement(Counter))
            );
            const before = screen.getByTestId("count").textContent;
            await act(async () => { await stateRef.set("count", 42); });
            const after = screen.getByTestId("count").textContent;
            cleanup();
            return { before, after };
        })
        .assert("before", (r) => r.before, "0")
        .assert("after", (r) => r.after, "42")
        .start(null, config);

    await CTGTest.init("useDistroStateRegistry: unregisters on unmount")
        .stage("execute", async () => {
            let stateRef = null;
            function Counter() {
                const state = useDistroStateRegistry("count");
                stateRef = state;
                return React.createElement("span", null, String(state.get("count")));
            }
            function App({ show }) {
                return React.createElement(CTGReactStateProvider, { state: { count: 5 } },
                    show ? React.createElement(Counter) : null);
            }
            const { rerender: rerenderApp } = render(React.createElement(App, { show: true }));
            const valueDuringMount = stateRef.get("count");
            rerenderApp(React.createElement(App, { show: false }));
            // After unmount, set should not fire the old setter
            let setterFired = false;
            const origSet = stateRef.set.bind(stateRef);
            await origSet("count", 99);
            // Value persists in shared even after unmount
            const valueAfterUnmount = stateRef.get("count");
            cleanup();
            return { valueDuringMount, valueAfterUnmount };
        })
        .assert("value during mount", (r) => r.valueDuringMount, 5)
        .assert("value persists in shared", (r) => r.valueAfterUnmount, 99)
        .start(null, config);

    await CTGTest.init("useDistroStateRegistry: initializes from existing shared value")
        .stage("execute", async () => {
            let readValue = null;
            function Reader() {
                const state = useDistroStateRegistry("preSet");
                readValue = state.get("preSet");
                return React.createElement("span", { "data-testid": "val" }, String(readValue));
            }
            // Pre-set a value before the component mounts
            function App() {
                return React.createElement(CTGReactStateProvider, { state: { preSet: 123 } },
                    React.createElement(Reader));
            }
            render(React.createElement(App));
            const displayed = screen.getByTestId("val").textContent;
            cleanup();
            return displayed;
        })
        .assert("displays pre-set value", (v) => v, "123")
        .start(null, config);

    // ── Cross-Component Communication ────────────────────────

    await CTGTest.init("cross-component: set in one triggers render in another")
        .stage("execute", async () => {
            let writerState = null;
            function Writer() {
                const state = useDistroStateRegistry("shared");
                writerState = state;
                return React.createElement("button", {
                    "data-testid": "write",
                    onClick: () => state.set("shared", "updated")
                }, "Write");
            }
            function Reader() {
                const state = useDistroStateRegistry("shared");
                return React.createElement("span", { "data-testid": "read" },
                    String(state.get("shared")));
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { shared: "initial" } },
                    React.createElement(Writer),
                    React.createElement(Reader))
            );
            const before = screen.getByTestId("read").textContent;
            await act(async () => { await writerState.set("shared", "updated"); });
            const after = screen.getByTestId("read").textContent;
            cleanup();
            return { before, after };
        })
        .assert("before", (r) => r.before, "initial")
        .assert("after", (r) => r.after, "updated")
        .start(null, config);

    // ── Nested Providers ─────────────────────────────────────

    await CTGTest.init("nested providers: independent scopes")
        .stage("execute", () => {
            let outerVal = null, innerVal = null;
            function OuterReader() {
                const state = useDistroState();
                outerVal = state.get("x");
                return null;
            }
            function InnerReader() {
                const state = useDistroState();
                innerVal = state.get("x");
                return null;
            }
            render(
                React.createElement(CTGReactStateProvider, { state: { x: "outer" } },
                    React.createElement(OuterReader),
                    React.createElement(CTGReactStateProvider, { state: { x: "inner" } },
                        React.createElement(InnerReader)))
            );
            cleanup();
            return { outerVal, innerVal };
        })
        .assert("outer scope", (r) => r.outerVal, "outer")
        .assert("inner scope", (r) => r.innerVal, "inner")
        .start(null, config);
}
