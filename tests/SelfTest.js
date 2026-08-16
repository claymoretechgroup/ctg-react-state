// Self-tests for ctg-react-state
//
// All tests run through React components via CTGReactTest.
// Sets up jsdom globally for DOM environment.
//
// Run: node --import ctg-react-test/jsx-loader tests/SelfTest.js

import {
    CTGTestConsoleFormatter,
    CTGTestResult
} from "ctg-react-test";

// ── jsdom Setup ──────────────────────────────────────────────

import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, writable: true, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.MutationObserver = dom.window.MutationObserver;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;
global.Element = dom.window.Element;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// ── Pipeline Categories ──────────────────────────────────────

import runExports from "./pipelines/exports.jsx";
import runErrorHandling from "./pipelines/errorHandling.jsx";
import runStateCRUD from "./pipelines/stateCRUD.jsx";
import runMultiKeyAndDerivation from "./pipelines/multiKeyAndDerivation.jsx";
import runNamespacing from "./pipelines/namespacing.jsx";
import runMiddleware from "./pipelines/middleware.jsx";
import runStrictMode from "./pipelines/strictMode.jsx";
import runSnapshots from "./pipelines/snapshots.jsx";
import runReactIntegration from "./pipelines/reactIntegration.jsx";

// ── Config ───────────────────────────────────────────────────

const config = { timeout: 0 };
const collector = [];

// ── Collect ─────────────────────────────────────────────────

function collect(state) {
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}

// ── Run ──────────────────────────────────────────────────────

process.stdout.write("=== ctg-react-state Self Test ===\n\n");

await runExports({ config, collect });
await runErrorHandling({ config, collect });
await runStateCRUD({ config, collect });
await runMultiKeyAndDerivation({ config, collect });
await runNamespacing({ config, collect });
await runMiddleware({ config, collect });
await runStrictMode({ config, collect });
await runSnapshots({ config, collect });
await runReactIntegration({ config, collect });

// ── Summary + Exit ───────────────────────────────────────────

process.stdout.write("\n=== All tests complete ===\n");

const S = CTGTestResult.STATUS;
const failed = collector.some((r) => r.status === S.FAIL || r.status === S.ERROR);
process.exit(failed ? 1 : 0);
