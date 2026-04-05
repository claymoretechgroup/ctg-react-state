// Multi-key and derivation tests through components

import CTGReactTest from "ctg-react-test";
import { CTGReactStateProvider } from "../../src/CTGReactStateProvider.js";
import { MultiKeyDisplay, Counter } from "../components.jsx";

export default async function run({ config, collect }) {

    collect(await CTGReactTest.init("multi-key: displays derived value")
        .assertComponent("total", (screen) =>
            screen.getByTestId("total").textContent, "30")
        .start(
            <CTGReactStateProvider state={{ price: 10, quantity: 3 }}>
                <MultiKeyDisplay keys={["price", "quantity"]} deriveFn={(p, q) => p * q} testId="total" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("multi-key: displays array of values")
        .assertComponent("values", (screen) =>
            screen.getByTestId("vals").textContent, "[10,3]")
        .start(
            <CTGReactStateProvider state={{ price: 10, quantity: 3 }}>
                <MultiKeyDisplay keys={["price", "quantity"]} testId="vals" />
            </CTGReactStateProvider>,
            config));

    collect(await CTGReactTest.init("multi-key: missing key returns undefined in array")
        .assertComponent("values", (screen) =>
            screen.getByTestId("vals").textContent.includes("null"), true)
        .start(
            <CTGReactStateProvider state={{ a: 1 }}>
                <MultiKeyDisplay keys={["a", "missing"]} testId="vals" />
            </CTGReactStateProvider>,
            config));
}
