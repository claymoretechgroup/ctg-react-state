// Namespacing tests through components

import React from "react";
import CTGReactTest, { CTGTestPredicates } from "ctg-react-test";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { NamespaceDisplay, Display, Probe } from "../components.jsx";

const P = CTGTestPredicates;
let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    collect(await CTGReactTest.init("namespace: displays namespace values")
        .stage("setup", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{}}>
                    <NamespaceDisplay prefix="ui" testId="ns" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                await act(async () => {
                    await stateRef.set("ui.sidebar", true);
                    await stateRef.set("ui.theme", "dark");
                });
                return stateRef.getNamespace("ui");
            } finally { cleanup(); }
        })
        .assert("sidebar", (state) => state.subject.sidebar, P.equals(true))
        .assert("theme", (state) => state.subject.theme, P.equals("dark"))
        .start(null, config));

    collect(await CTGReactTest.init("namespace: setNamespace writes prefixed keys")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{}}>
                    <Display stateKey="ui.open" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                await act(async () => {
                    await stateRef.setNamespace("ui", { open: true, width: 300 });
                });
                return { open: stateRef.get("ui.open"), width: stateRef.get("ui.width") };
            } finally { cleanup(); }
        })
        .assert("open", (state) => state.subject.open, P.equals(true))
        .assert("width", (state) => state.subject.width, P.equals(300))
        .start(null, config));

    collect(await CTGReactTest.init("namespace: empty namespace returns empty object")
        .stage("execute", async () => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ other: 1 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                return Object.keys(stateRef.getNamespace("empty")).length;
            } finally { cleanup(); }
        })
        .assert("empty", (state) => state.subject, P.equals(0))
        .start(null, config));
}
