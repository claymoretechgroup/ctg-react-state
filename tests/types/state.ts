import CTGReactState from "ctg-react-state";
import type { CTGReactStateMiddleware, CTGReactStateMutator } from "ctg-react-state";

interface StateShape {
    count: number;
    title: string;
    done: boolean;
}

const state = new CTGReactState<StateShape>({ count: 1, title: "Draft", done: false });

const count = state.get("count");
count.toFixed(0);

const derived = state.get(["count", "title"], (countValue, titleValue) =>
    `${String(titleValue)}:${Number(countValue)}`
);
derived.toUpperCase();

await state.set("count", 2);
await state.set({ title: "Published", done: true });
await state.set("title", ["count"], (countValue) => `Count ${Number(countValue)}`);

state.register("done", [false, (value) => value.valueOf()]);
state.unregister("done");

const exported: StateShape = state.export();
await state.import({ count: 3 });

const middleware: CTGReactStateMiddleware = (id, next) => next;
state.use(middleware);

const mutator: CTGReactStateMutator<StateShape, number> = (shared, amount) => ({
    count: shared.count + amount
});
state.mutator("increment", mutator);
await state.mutate("increment", 2);

// @ts-expect-error typed read preserves the known value type
state.get("done").toUpperCase();

// @ts-expect-error mutator must return an object
state.mutator("bad", () => 1);

exported.done.valueOf();
