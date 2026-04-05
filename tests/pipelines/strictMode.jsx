// Strict mode tests through components

import React from "react";
import CTGReactTest from "ctg-react-test";
import CTGReactState from "../../src/CTGReactState.js";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { Counter, Display, ErrorDisplay, MutateButton, Probe } from "../components.jsx";

let render, screen, act, cleanup;

export default async function run({ config, collect }) {
    const rtl = await import("@testing-library/react");
    render = rtl.render; screen = rtl.screen; act = rtl.act; cleanup = rtl.cleanup;

    collect(await CTGReactTest.init("strict: raw set throws STRICT_VIOLATION")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "STRICT_VIOLATION")
        .start(
            <CTGReactStateProvider state={{ count: 0 }} config={{ strict: true }}>
                <ErrorDisplay operation={(s) => s.set("count", 5)} />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("strict: mutate works with named mutator")
        .stage("execute", async (state) => {
            let stateRef = null;
            const instance = CTGReactState.init({ count: 0 }, {}, { strict: true });
            instance.mutator("increment", (shared) => ({ count: shared.count + 1 }));
            render(
                <CTGReactStateProvider state={{ count: 0 }} config={{ strict: true }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.mutator("increment", (shared) => ({ count: shared.count + 1 }));
                await act(async () => { await stateRef.mutate("increment"); });
                state.subject = screen.getByTestId("count-value").textContent;
                return state;
            } finally { cleanup(); }
        })
        .assert("count incremented", (state) => state.subject, "1")
        .start(null, config));

    collect(await CTGReactTest.init("strict: mutate with payload")
        .stage("execute", async (state) => {
            let stateRef = null;
            render(
                <CTGReactStateProvider state={{ count: 0 }} config={{ strict: true }}>
                    <Counter stateKey="count" />
                    <Probe onState={(s) => { stateRef = s; }} />
                </CTGReactStateProvider>
            );
            try {
                stateRef.mutator("setTo", (shared, val) => ({ count: val }));
                await act(async () => { await stateRef.mutate("setTo", 5); });
                state.subject = screen.getByTestId("count-value").textContent;
                return state;
            } finally { cleanup(); }
        })
        .assert("count is 5", (state) => state.subject, "5")
        .start(null, config));

    collect(await CTGReactTest.init("strict: unknown mutator throws")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "UNKNOWN_MUTATOR")
        .start(
            <CTGReactStateProvider state={{ count: 0 }} config={{ strict: true }}>
                <ErrorDisplay operation={(s) => s.mutate("nonexistent")} />
            </CTGReactStateProvider>,
            config));
}
