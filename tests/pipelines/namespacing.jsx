// Namespacing tests through components

import React from "react";
import CTGReactTest from "ctg-react-test";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { NamespaceDisplay, Display, Probe } from "../components.jsx";

let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    collect(await CTGReactTest.init("namespace: displays namespace values")
        .stage("setup", async (state) => {
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
                state.subject = stateRef.getNamespace("ui");
                return state;
            } finally { cleanup(); }
        })
        .assert("sidebar", (state) => state.subject.sidebar, true)
        .assert("theme", (state) => state.subject.theme, "dark")
        .start(null, config));

    collect(await CTGReactTest.init("namespace: setNamespace writes prefixed keys")
        .stage("execute", async (state) => {
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
                state.subject = { open: stateRef.get("ui.open"), width: stateRef.get("ui.width") };
                return state;
            } finally { cleanup(); }
        })
        .assert("open", (state) => state.subject.open, true)
        .assert("width", (state) => state.subject.width, 300)
        .start(null, config));

    collect(await CTGReactTest.init("namespace: empty namespace returns empty object")
        .stage("execute", async (state) => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ other: 1 }}>
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                state.subject = Object.keys(stateRef.getNamespace("empty")).length;
                return state;
            } finally { cleanup(); }
        })
        .assert("empty", (state) => state.subject, 0)
        .start(null, config));
}
