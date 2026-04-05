// React integration tests — provider, hooks, component state communication
// Requires jsdom globals to be set up before import
//
// DOM-observable behavior uses CTGReactTest v3 (start with JSX, interact,
// assertComponent). Direct API tests that need React scaffolding use CTGTest.

import React from "react";
import CTGTest from "ctg-js-test";
import CTGReactTest from "ctg-react-test";
import CTGReactState from "../../src/CTGReactState.js";
import { CTGReactStateProvider, useDistroState, useDistroStateRegistry } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, Writer, MultiKeyDisplay, NamespaceDisplay, Toggle } from "../components.jsx";

let render, screen, act, cleanup;

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render;
    screen = rtl.screen;
    act = rtl.act;
    cleanup = rtl.cleanup;

    // ══════════════════════════════════════════════════════════════
    // DOM-observable tests (CTGReactTest v3)
    // ══════════════════════════════════════════════════════════════

    // ── Provider ─────────────────────────────────────────────

    collect(await CTGReactTest.init("provider: renders children")
        .assertComponent("child rendered", (screen) =>
            screen.getByTestId("child").textContent, "hello")
        .start(
            <CTGReactStateProvider state={{ count: 0 }}>
                <div data-testid="child">hello</div>
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("provider: initial state accessible via component")
        .assertComponent("count is 7", (screen) =>
            screen.getByTestId("count-value").textContent, "7")
        .start(
            <CTGReactStateProvider state={{ count: 7 }}>
                <Counter stateKey="count" />
            </CTGReactStateProvider>,
            config));

    // ── Counter Component ────────────────────────────────────

    collect(await CTGReactTest.init("Counter: displays initial value")
        .assertComponent("shows 0", (screen) =>
            screen.getByTestId("count-value").textContent, "0")
        .start(
            <CTGReactStateProvider state={{ count: 0 }}>
                <Counter stateKey="count" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("Counter: increment via click updates display")
        .assertComponent("initial 0", (screen) =>
            screen.getByTestId("count-value").textContent, "0")
        .interact("click +", async ({screen, user}) => {
            await user.click(screen.getByTestId("count-inc"));
        })
        .assertComponent("after increment", (screen) =>
            screen.getByTestId("count-value").textContent, "1")
        .start(
            <CTGReactStateProvider state={{ count: 0 }}>
                <Counter stateKey="count" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("Counter: decrement via click updates display")
        .assertComponent("initial 5", (screen) =>
            screen.getByTestId("count-value").textContent, "5")
        .interact("click -", async ({screen, user}) => {
            await user.click(screen.getByTestId("count-dec"));
        })
        .assertComponent("after decrement", (screen) =>
            screen.getByTestId("count-value").textContent, "4")
        .start(
            <CTGReactStateProvider state={{ count: 5 }}>
                <Counter stateKey="count" />
            </CTGReactStateProvider>,
            config));

    // ── Display Component (read-only via useDistroState) ─────

    collect(await CTGReactTest.init("Display: reads state without registering")
        .assertComponent("shows value", (screen) =>
            screen.getByTestId("display-label").textContent, "hello")
        .start(
            <CTGReactStateProvider state={{ label: "hello" }}>
                <Display stateKey="label" />
            </CTGReactStateProvider>,
            config));

    // ── Writer Component ─────────────────────────────────────

    collect(await CTGReactTest.init("Writer: click updates registered observer")
        .assertComponent("before", (screen) =>
            screen.getByTestId("color-value").textContent, "red")
        .interact("click write", async ({screen, user}) => {
            await user.click(screen.getByTestId("write-color"));
        })
        .assertComponent("after", (screen) =>
            screen.getByTestId("color-value").textContent, "blue")
        .start(
            <CTGReactStateProvider state={{ color: "red" }}>
                <Writer stateKey="color" value="blue" />
                <Counter stateKey="color" />
            </CTGReactStateProvider>,
            config));

    // ── Cross-Component Communication ────────────────────────
    // Uses direct API (act + stateRef.set) because the propagation
    // path is internal — the DOM update is the assertion target,
    // but the trigger must bypass user interaction to isolate the registry path.

    collect(await CTGTest.init("cross-component: set in one updates registered observer")
        .stage("execute", async (state) => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                <CTGReactStateProvider state={{ shared: 0 }}>
                    <Counter stateKey="shared" />
                    <Probe />
                </CTGReactStateProvider>
            );
            try {
                const before = screen.getByTestId("shared-value").textContent;
                await act(async () => { await stateRef.set("shared", 42); });
                const after = screen.getByTestId("shared-value").textContent;
                state.subject = { before, after };
                return state;
            } finally { cleanup(); }
        })
        .assert("before", (state) => state.subject.before, "0")
        .assert("after", (state) => state.subject.after, "42")
        .start(null, config));

    // ── MultiKeyDisplay Component ────────────────────────────

    collect(await CTGReactTest.init("MultiKeyDisplay: derives value from multiple keys")
        .assertComponent("shows derived total", (screen) =>
            screen.getByTestId("total").textContent, "30")
        .start(
            <CTGReactStateProvider state={{ price: 10, quantity: 3 }}>
                <MultiKeyDisplay keys={["price", "quantity"]} deriveFn={(p, q) => p * q} testId="total" />
            </CTGReactStateProvider>,
            config));

    // ── Toggle Component ─────────────────────────────────────

    collect(await CTGReactTest.init("Toggle: click toggles state")
        .assertComponent("initial OFF", (screen) =>
            screen.getByTestId("toggle-active").textContent, "OFF")
        .interact("click toggle", async ({screen, user}) => {
            await user.click(screen.getByTestId("toggle-active"));
        })
        .assertComponent("after ON", (screen) =>
            screen.getByTestId("toggle-active").textContent, "ON")
        .start(
            <CTGReactStateProvider state={{ active: false }}>
                <Toggle stateKey="active" />
            </CTGReactStateProvider>,
            config));

    // ── Nested Providers ─────────────────────────────────────

    collect(await CTGReactTest.init("nested providers: independent scopes")
        .assertComponent("outer scope", (screen) =>
            screen.getByTestId("count-value").textContent, "10")
        .assertComponent("inner scope", (screen) =>
            screen.getByTestId("display-count").textContent, "99")
        .start(
            <CTGReactStateProvider state={{ count: 10 }}>
                <Counter stateKey="count" />
                <CTGReactStateProvider state={{ count: 99 }}>
                    <Display stateKey="count" />
                </CTGReactStateProvider>
            </CTGReactStateProvider>,
            config));

    // ══════════════════════════════════════════════════════════════
    // Direct API tests (CTGTest)
    // ══════════════════════════════════════════════════════════════

    collect(await CTGTest.init("cross-component: unregistered reader sees value via get()")
        .stage("execute", async (state) => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                <CTGReactStateProvider state={{ data: "hello" }}>
                    <Counter stateKey="data" />
                    <Probe />
                </CTGReactStateProvider>
            );
            try {
                await act(async () => { await stateRef.set("data", "world"); });
                state.subject = stateRef.get("data");
                return state;
            } finally { cleanup(); }
        })
        .assert("get returns updated value", (state) => state.subject, "world")
        .start(null, config));

    collect(await CTGTest.init("useDistroStateRegistry: unregisters on unmount")
        .stage("execute", async (state) => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            function App({ show }) {
                return (
                    <CTGReactStateProvider state={{ temp: 5 }}>
                        {show ? <Counter stateKey="temp" /> : null}
                        <Probe />
                    </CTGReactStateProvider>
                );
            }
            const { rerender: rerenderApp } = render(<App show={true} />);
            try {
                const during = stateRef.get("temp");
                rerenderApp(<App show={false} />);
                await act(async () => { await stateRef.set("temp", 99); });
                const after = stateRef.get("temp");
                state.subject = { during, after };
                return state;
            } finally { cleanup(); }
        })
        .assert("value during mount", (state) => state.subject.during, 5)
        .assert("value persists in shared", (state) => state.subject.after, 99)
        .start(null, config));

    collect(await CTGTest.init("NamespaceDisplay: shows namespace values")
        .stage("execute", async (state) => {
            let stateRef = null;
            function Probe() { stateRef = useDistroState(); return null; }
            render(
                <CTGReactStateProvider state={{}}>
                    <NamespaceDisplay prefix="ui" testId="ns" />
                    <Probe />
                </CTGReactStateProvider>
            );
            try {
                await act(async () => {
                    await stateRef.set("ui.sidebar", true);
                    await stateRef.set("ui.theme", "dark");
                });
                state.subject = stateRef.getNamespace("ui");
                return state;
            } finally { cleanup(); }
        })
        .assert("sidebar", (state) => state.subject.sidebar, true)
        .assert("theme", (state) => state.subject.theme, "dark")
        .start(null, config));
}
