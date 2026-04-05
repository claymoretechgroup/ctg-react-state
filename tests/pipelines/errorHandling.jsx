// Error handling tests — verifies errors propagate through React components

import CTGReactTest from "ctg-react-test";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { ErrorDisplay, Probe } from "../components.jsx";

export default async function run({ config, collect }) {

    collect(await CTGReactTest.init("error: reserved key __proto__ rejected")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "INVALID_KEY")
        .start(
            <CTGReactStateProvider state={{}}>
                <ErrorDisplay operation={(s) => s.set("__proto__", "bad")} />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("error: reserved key constructor rejected")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "INVALID_KEY")
        .start(
            <CTGReactStateProvider state={{}}>
                <ErrorDisplay operation={(s) => s.set("constructor", "bad")} />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("error: reserved key prototype rejected")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "INVALID_KEY")
        .start(
            <CTGReactStateProvider state={{}}>
                <ErrorDisplay operation={(s) => s.set("prototype", "bad")} />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("error: empty string key rejected")
        .interact("trigger", async ({screen, user}) => {
            await user.click(screen.getByTestId("error-trigger"));
        })
        .assertComponent("error type", (screen) =>
            screen.getByTestId("error-type").textContent, "INVALID_KEY")
        .start(
            <CTGReactStateProvider state={{}}>
                <ErrorDisplay operation={(s) => s.set("", "bad")} />
            </CTGReactStateProvider>,
            config));
}
