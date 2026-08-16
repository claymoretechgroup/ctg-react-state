import CTGReactState, { CTGReactStateSnapshot } from "ctg-react-state";
import type { CTGReactStateSnapshotStorage } from "ctg-react-state";

interface StateShape {
    count: number;
}

const state = CTGReactState.init<StateShape>({ count: 0 });

const memory = new Map<string, StateShape>();
const storage: CTGReactStateSnapshotStorage<StateShape> = {
    save(key, data) {
        memory.set(key, data);
    },
    load(key) {
        return memory.get(key);
    },
    list() {
        return [...memory.keys()];
    },
    remove(key) {
        memory.delete(key);
    }
};

const snapshots = new CTGReactStateSnapshot(state, {
    storage,
    maxHistory: 10,
    auto: true
});

await snapshots.save("initial");
await snapshots.restore("initial");
const keys = await snapshots.list();
await snapshots.back();
await snapshots.forward();
snapshots.current()?.toUpperCase();
await snapshots.clear();

keys.map((key) => key.toUpperCase());

// @ts-expect-error storage must implement remove
const badStorage: CTGReactStateSnapshotStorage<StateShape> = {
    save() {},
    load() { return null; },
    list() { return []; }
};

badStorage;
