// Middleware tests through components

import React from "react";
import CTGReactTest from "ctg-react-test";
import CTGTestPredicates from "ctg-js-test/predicates";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, Probe } from "../components.jsx";

const P = CTGTestPredicates;
let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    collect(await CTGReactTest.init("middleware: transforms value observable in component")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.use((id, val) => val * 2);
                await act(async () => { await stateRef.set("count", 5); });
                return screen.getByTestId("count-value").textContent;
            } finally { cleanup(); }
        })
        .assert("doubled", (state) => state.subject, P.equals("10"))
        .start(null, config));

    collect(await CTGReactTest.init("middleware: chained transforms")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.use((id, val) => val + 10);
                stateRef.use((id, val) => val * 2);
                await act(async () => { await stateRef.set("count", 5); });
                return screen.getByTestId("count-value").textContent;
            } finally { cleanup(); }
        })
        .assert("(5+10)*2 = 30", (state) => state.subject, P.equals("30"))
        .start(null, config));

    collect(await CTGReactTest.init("middleware: rejection prevents write")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 5 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.use(() => { throw new Error("rejected"); });
                let threw = false;
                try {
                    await act(async () => { await stateRef.set("count", 99); });
                } catch { threw = true; }
                return { value: stateRef.get("count"), threw };
            } finally { cleanup(); }
        })
        .assert("value unchanged", (state) => state.subject.value, P.equals(5))
        .assert("threw", (state) => state.subject.threw, P.equals(true))
        .start(null, config));

    collect(await CTGReactTest.init("middleware: receives id, nextValue, prevValue")
        .stage("execute", async () => {
            let stateRef = null;
            let captured = {};
            render(
                <CTGReactStateProvider state={{ count: 1 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.use((id, next, prev) => {
                    captured = { id, next, prev };
                    return next;
                });
                await act(async () => { await stateRef.set("count", 42); });
                return captured;
            } finally { cleanup(); }
        })
        .assert("id", (state) => state.subject.id, P.equals("count"))
        .assert("next", (state) => state.subject.next, P.equals(42))
        .assert("prev", (state) => state.subject.prev, P.equals(1))
        .start(null, config));
}
