// Snapshot tests through components

import React from "react";
import CTGReactTest, { CTGTestPredicates } from "ctg-react-test";
import CTGReactStateSnapshot from "../../src/CTGReactStateSnapshot.js";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, Probe } from "../components.jsx";

const P = CTGTestPredicates;
let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    collect(await CTGReactTest.init("snapshot: save and restore through component")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const snap = new CTGReactStateSnapshot(stateRef);
                await snap.save("initial");
                await act(async () => { await stateRef.set("count", 42); });
                const afterSet = screen.getByTestId("count-value").textContent;
                await act(async () => { await snap.restore("initial"); });
                const afterRestore = screen.getByTestId("count-value").textContent;
                return { afterSet, afterRestore };
            } finally { cleanup(); }
        })
        .assert("after set", (state) => state.subject.afterSet, P.equals("42"))
        .assert("after restore", (state) => state.subject.afterRestore, P.equals("0"))
        .start(null, config));

    collect(await CTGReactTest.init("snapshot: back/forward navigates state")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const snap = new CTGReactStateSnapshot(stateRef);
                await snap.save("s0");
                await act(async () => { await stateRef.set("count", 10); });
                await snap.save("s1");
                await act(async () => { await stateRef.set("count", 20); });
                await snap.save("s2");
                await act(async () => { await snap.back(); });
                const atS1 = stateRef.get("count");
                await act(async () => { await snap.back(); });
                const atS0 = stateRef.get("count");
                await act(async () => { await snap.forward(); });
                const backToS1 = stateRef.get("count");
                return { atS1, atS0, backToS1 };
            } finally { cleanup(); }
        })
        .assert("back to s1", (state) => state.subject.atS1, P.equals(10))
        .assert("back to s0", (state) => state.subject.atS0, P.equals(0))
        .assert("forward to s1", (state) => state.subject.backToS1, P.equals(10))
        .start(null, config));

    collect(await CTGReactTest.init("snapshot: auto captures on every set")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const snap = new CTGReactStateSnapshot(stateRef, { auto: true });
                await act(async () => { await stateRef.set("count", 1); });
                await act(async () => { await stateRef.set("count", 2); });
                await act(async () => { await stateRef.set("count", 3); });
                const list = await snap.list();
                await act(async () => { await snap.back(); });
                const backOne = stateRef.get("count");
                return { snapCount: list.length, backOne };
            } finally { cleanup(); }
        })
        .assert("3 auto-snapshots", (state) => state.subject.snapCount, P.equals(3))
        .assert("time-travel works", (state) => state.subject.backOne, P.equals(1))
        .start(null, config));

    collect(await CTGReactTest.init("snapshot: clear removes all snapshots")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const snap = new CTGReactStateSnapshot(stateRef);
                await snap.save("a");
                await snap.save("b");
                snap.clear();
                const list = await snap.list();
                return { count: list.length, cursor: snap.current() };
            } finally { cleanup(); }
        })
        .assert("empty", (state) => state.subject.count, P.equals(0))
        .assert("cursor reset", (state) => state.subject.cursor, P.equals(null))
        .start(null, config));

    collect(await CTGReactTest.init("snapshot: maxHistory trims oldest")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                const snap = new CTGReactStateSnapshot(stateRef, { maxHistory: 3 });
                await snap.save("a");
                await snap.save("b");
                await snap.save("c");
                await snap.save("d");
                const list = await snap.list();
                return { count: list.length, hasA: list.includes("a") };
            } finally { cleanup(); }
        })
        .assert("3 snapshots", (state) => state.subject.count, P.equals(3))
        .assert("oldest trimmed", (state) => state.subject.hasA, P.equals(false))
        .start(null, config));
}
