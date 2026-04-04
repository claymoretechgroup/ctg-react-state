// Self-tests for ctg-react-state
//
// Composes test pipelines from category modules.
// Sets up jsdom globally — required by React integration tests and
// used as the DOM environment for all pipelines in the suite.
// Pure JS tests (core, middleware, snapshots) don't touch the DOM
// but run in the same process for simplicity.
//
// React integration tests use CTGReactTest for DOM-driven assertions
// and CTGTest for direct API tests that need React as scaffolding.

import CTGTest from "ctg-js-test"; // Test framework

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

import runErrorClass from "./pipelines/errorClass.js";
import runCoreRegistry from "./pipelines/coreRegistry.js";
import runMultiKey from "./pipelines/multiKey.js";
import runNamespacing from "./pipelines/namespacing.js";
import runMiddleware from "./pipelines/middleware.js";
import runStrictMode from "./pipelines/strictMode.js";
import runSnapshots from "./pipelines/snapshots.js";
import runReactIntegration from "./pipelines/reactIntegration.js";

// ── Config ───────────────────────────────────────────────────

const config = { output: "console", timeout: 0 };

// ── Run ──────────────────────────────────────────────────────

process.stdout.write("=== ctg-react-state Self Test ===\n\n");

await runErrorClass({ config });
await runCoreRegistry({ config });
await runMultiKey({ config });
await runNamespacing({ config });
await runMiddleware({ config });
await runStrictMode({ config });
await runSnapshots({ config });
await runReactIntegration({ config });

// ── Summary + Exit ───────────────────────────────────────────

process.stdout.write("\n=== All tests complete ===\n");

const failed = CTGTest._results.some((r) => r.status === "fail" || r.status === "error");
process.exit(failed ? 1 : 0);
