// CTGReactStateSnapshot tests — save, restore, time-travel, storage, auto-snap

import CTGTest from "../../../ctg-js-test/src/CTGTest.js";
import CTGReactState from "../../src/CTGReactState.js";
import CTGReactStateSnapshot from "../../src/CTGReactStateSnapshot.js";
import CTGReactStateError from "../../src/CTGReactStateError.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    // ── Save / Restore ───────────────────────────────────────

    await CTGTest.init("snapshot: save captures current state")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("initial");
            await s.set("count", 10);
            return { current: s.get("count"), list: await snap.list() };
        })
        .assert("state changed", (r) => r.current, 10)
        .assert("snapshot saved", (r) => r.list.length, 1)
        .assert("key is initial", (r) => r.list[0], "initial")
        .start(null, config);

    await CTGTest.init("snapshot: restore brings back saved state")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("before");
            await s.set("count", 99);
            await snap.restore("before");
            return s.get("count");
        })
        .assert("count restored", (v) => v, 0)
        .start(null, config);

    await CTGTest.init("snapshot: restore fires bound setters")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            let firedVal = null;
            s.register("count", [0, (v) => { firedVal = v; }]);
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("saved");
            await s.set("count", 99);
            await snap.restore("saved");
            return firedVal;
        })
        .assert("setter fired with restored value", (v) => v, 0)
        .start(null, config);

    await CTGTest.init("snapshot: restore unknown key throws SNAPSHOT_NOT_FOUND")
        .stage("attempt", async () => {
            const snap = new CTGReactStateSnapshot(CTGReactState.init());
            try { await snap.restore("nope"); return "no throw"; }
            catch (e) { return e instanceof CTGReactStateError && e.type === "SNAPSHOT_NOT_FOUND" ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    // ── Auto-Key ─────────────────────────────────────────────

    await CTGTest.init("snapshot: save defaults to auto-incrementing key")
        .stage("setup", async () => {
            const snap = new CTGReactStateSnapshot(CTGReactState.init({ a: 1 }));
            await snap.save();
            await snap.save();
            await snap.save();
            return await snap.list();
        })
        .assert("3 snapshots", (l) => l.length, 3)
        .start(null, config);

    // ── Time-Travel ──────────────────────────────────────────

    await CTGTest.init("snapshot: back/forward navigates cursor")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("s0");
            await s.set("count", 1);
            await snap.save("s1");
            await s.set("count", 2);
            await snap.save("s2");

            await snap.back(); // -> s1 (count=1)
            const afterBack1 = s.get("count");
            await snap.back(); // -> s0 (count=0)
            const afterBack2 = s.get("count");
            await snap.forward(); // -> s1 (count=1)
            const afterFwd = s.get("count");

            return { afterBack1, afterBack2, afterFwd };
        })
        .assert("back to s1", (r) => r.afterBack1, 1)
        .assert("back to s0", (r) => r.afterBack2, 0)
        .assert("forward to s1", (r) => r.afterFwd, 1)
        .start(null, config);

    await CTGTest.init("snapshot: back at beginning is no-op")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 5 });
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("only");
            await snap.back(); // already at beginning
            await snap.back(); // still no-op
            return s.get("count");
        })
        .assert("unchanged", (v) => v, 5)
        .start(null, config);

    await CTGTest.init("snapshot: forward at end is no-op")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 5 });
            const snap = new CTGReactStateSnapshot(s);
            await snap.save("only");
            await snap.forward(); // already at end
            return s.get("count");
        })
        .assert("unchanged", (v) => v, 5)
        .start(null, config);

    await CTGTest.init("snapshot: current returns cursor key")
        .stage("setup", async () => {
            const snap = new CTGReactStateSnapshot(CTGReactState.init({ a: 1 }));
            const before = snap.current();
            await snap.save("s0");
            await snap.save("s1");
            await snap.back();
            return { before, after: snap.current() };
        })
        .assert("before is null", (r) => r.before, null)
        .assert("after back is s0", (r) => r.after, "s0")
        .start(null, config);

    // ── Clear ────────────────────────────────────────────────

    await CTGTest.init("snapshot: clear removes all snapshots")
        .stage("setup", async () => {
            const snap = new CTGReactStateSnapshot(CTGReactState.init());
            await snap.save("a");
            await snap.save("b");
            await snap.clear();
            return { list: await snap.list(), cursor: snap.current() };
        })
        .assert("empty list", (r) => r.list.length, 0)
        .assert("cursor reset", (r) => r.cursor, null)
        .start(null, config);

    // ── maxHistory ────────────────────────────────────────────

    await CTGTest.init("snapshot: maxHistory trims oldest")
        .stage("setup", async () => {
            const snap = new CTGReactStateSnapshot(CTGReactState.init(), { maxHistory: 3 });
            await snap.save("s0");
            await snap.save("s1");
            await snap.save("s2");
            await snap.save("s3"); // should trim s0
            return await snap.list();
        })
        .assert("3 snapshots", (l) => l.length, 3)
        .assert("oldest trimmed", (l) => l[0] !== "s0", true)
        .start(null, config);

    // ── Auto-Snapshot ────────────────────────────────────────

    await CTGTest.init("snapshot: auto captures on every set")
        .stage("setup", async () => {
            const s = CTGReactState.init({ count: 0 });
            const snap = new CTGReactStateSnapshot(s, { auto: true });
            await s.set("count", 1);
            await s.set("count", 2);
            await s.set("count", 3);
            const list = await snap.list();
            await snap.back();
            await snap.back();
            return { count: list.length, restored: s.get("count") };
        })
        .assert("3 auto-snapshots", (r) => r.count, 3)
        .assert("time-travel works", (r) => r.restored, 1)
        .start(null, config);

    // ── Pluggable Storage ────────────────────────────────────

    await CTGTest.init("snapshot: pluggable storage backend")
        .stage("setup", async () => {
            const store = {};
            const storage = {
                async save(key, data) { store[key] = data; },
                async load(key) { return store[key] || null; },
                async list() { return Object.keys(store); },
                async remove(key) { delete store[key]; }
            };
            const s = CTGReactState.init({ x: 42 });
            const snap = new CTGReactStateSnapshot(s, { storage });
            await snap.save("test");
            return { stored: store.test !== undefined, val: store.test?.x };
        })
        .assert("stored in backend", (r) => r.stored, true)
        .assert("value correct", (r) => r.val, 42)
        .start(null, config);

    // ── Chainability ─────────────────────────────────────────

    await CTGTest.init("snapshot: save/restore/clear are chainable")
        .stage("check", async () => {
            const s = CTGReactState.init({ a: 1 });
            const snap = new CTGReactStateSnapshot(s);
            const r1 = await snap.save("s");
            const r2 = await snap.restore("s");
            const r3 = await snap.clear();
            return r1 === snap && r2 === snap && r3 === snap;
        })
        .assert("all chainable", (r) => r, true)
        .start(null, config);
}
