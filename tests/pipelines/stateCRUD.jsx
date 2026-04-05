// State CRUD tests — register, get, set, unregister, export, import through components

import React from "react";
import CTGReactTest from "ctg-react-test";
import { CTGReactStateProvider, useDistroState } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, Writer, Probe } from "../components.jsx";

let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    // ── Get/Set ─────────────────────────────────────────────

    collect(await CTGReactTest.init("set: writes value observable by component")
        .assertComponent("initial", (screen) =>
            screen.getByTestId("count-value").textContent, "0")
        .interact("increment", async ({screen, user}) => {
            await user.click(screen.getByTestId("count-inc"));
        })
        .assertComponent("updated", (screen) =>
            screen.getByTestId("count-value").textContent, "1")
        .start(
            <CTGReactStateProvider state={{ count: 0 }}>
                <Counter stateKey="count" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("get: reads initial state")
        .assertComponent("value", (screen) =>
            screen.getByTestId("display-name").textContent, "hello")
        .start(
            <CTGReactStateProvider state={{ name: "hello" }}>
                <Display stateKey="name" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("get: returns undefined for missing key")
        .assertComponent("missing", (screen) =>
            screen.getByTestId("display-nope").textContent, "undefined")
        .start(
            <CTGReactStateProvider state={{}}>
                <Display stateKey="nope" />
            </CTGReactStateProvider>,
            config));

    // ── Register/Unregister ─────────────────────────────────

    collect(await CTGReactTest.init("register: bound setter fires on set")
        .assertComponent("before", (screen) =>
            screen.getByTestId("color-value").textContent, "red")
        .interact("write", async ({screen, user}) => {
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

    // ── Export ───────────────────────────────────────────────

    collect(await CTGReactTest.init("export: returns state snapshot through component")
        .stage("execute", async (state) => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ a: 1, b: 2 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const exported = stateRef.export();
                state.subject = { keys: Object.keys(exported).sort(), a: exported.a, b: exported.b };
                return state;
            } finally { cleanup(); }
        })
        .assert("has keys", (state) => JSON.stringify(state.subject.keys), JSON.stringify(["a", "b"]))
        .assert("a value", (state) => state.subject.a, 1)
        .assert("b value", (state) => state.subject.b, 2)
        .start(null, config));

    // ── Import ──────────────────────────────────────────────

    collect(await CTGReactTest.init("import: updates state observable by component")
        .stage("execute", async (state) => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const before = screen.getByTestId("count-value").textContent;
                await act(async () => { await stateRef.import({ count: 42 }); });
                const after = screen.getByTestId("count-value").textContent;
                state.subject = { before, after };
                return state;
            } finally { cleanup(); }
        })
        .assert("before", (state) => state.subject.before, "0")
        .assert("after", (state) => state.subject.after, "42")
        .start(null, config));

    // ── Import Rollback ─────────────────────────────────────

    collect(await CTGReactTest.init("import: rolls back on middleware failure")
        .stage("execute", async (state) => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ x: 1 }}>
                    <Counter stateKey="x" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.use((id, val) => {
                    if (id === "y") throw new Error("reject y");
                    return val;
                });
                try {
                    await act(async () => { await stateRef.import({ x: 99, y: 2 }); });
                } catch {}
                state.subject = stateRef.get("x");
                return state;
            } finally { cleanup(); }
        })
        .assert("x rolled back", (state) => state.subject, 1)
        .start(null, config));
}
