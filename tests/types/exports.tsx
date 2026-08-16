import CTGReactState, {
    CTGReactState as NamedState,
    CTGReactStateError,
    CTGReactStateProvider,
    CTGReactStateSnapshot,
    useDistroState,
    useDistroStateRegistry
} from "ctg-react-state";
import type {
    CTGReactStateConfig,
    CTGReactStateErrorCode,
    CTGReactStateErrorType,
    CTGReactStateProviderProps
} from "ctg-react-state";

interface AppState {
    count: number;
    label: string;
    nested: { active: boolean };
}

const sameState: typeof CTGReactState = NamedState;
const config: CTGReactStateConfig = { join: ".", strict: false };
const state = CTGReactState.init<AppState>({ count: 0, label: "ready" }, {}, config);

state.get("count").toFixed(0);
state.get("label").toUpperCase();
state.set("count", 1);

const snapshot = new CTGReactStateSnapshot(state);
await snapshot.save("initial");

const errorType: CTGReactStateErrorType = "STRICT_VIOLATION";
const errorCode: CTGReactStateErrorCode = 1001;
const err = new CTGReactStateError(errorType);
err.code === errorCode;

const props: CTGReactStateProviderProps<AppState> = {
    state: { count: 0 },
    config,
    children: null
};

<CTGReactStateProvider<AppState> {...props} />;

function Probe() {
    const registry = useDistroState<AppState>();
    const registered = useDistroStateRegistry<AppState>("count");
    registry.get("nested").active.valueOf();
    registered.set("label", "done");
    return null;
}

Probe;
sameState;

// @ts-expect-error invalid config key
CTGReactState.init<AppState>({}, {}, { unknown: true });

// @ts-expect-error invalid error type
new CTGReactStateError("BOGUS");

// @ts-expect-error typed read preserves the known value type
state.get("count").toUpperCase();
