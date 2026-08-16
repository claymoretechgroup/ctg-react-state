// Package export surface

import { CTGTest, CTGTestPredicates } from "ctg-react-test";
import CTGReactState, {
    CTGReactState as NamedState,
    CTGReactStateError,
    CTGReactStateProvider,
    CTGReactStateSnapshot,
    useDistroState,
    useDistroStateRegistry
} from "ctg-react-state";

export default async function run({ config, collect }) {
    collect(await CTGTest.init("root package exports")
        .stage("import package", () => import("ctg-react-state"))
        .assert("default is state", (state) => state.subject.default, CTGTestPredicates.equals(CTGReactState))
        .assert("named state is exported", (state) => state.subject.CTGReactState, CTGTestPredicates.equals(NamedState))
        .assert("error is exported", (state) => state.subject.CTGReactStateError, CTGTestPredicates.equals(CTGReactStateError))
        .assert("snapshot is exported", (state) => state.subject.CTGReactStateSnapshot, CTGTestPredicates.equals(CTGReactStateSnapshot))
        .assert("provider is exported", (state) => state.subject.CTGReactStateProvider, CTGTestPredicates.equals(CTGReactStateProvider))
        .assert("useDistroState is exported", (state) => state.subject.useDistroState, CTGTestPredicates.equals(useDistroState))
        .assert("useDistroStateRegistry is exported", (state) => state.subject.useDistroStateRegistry, CTGTestPredicates.equals(useDistroStateRegistry))
        .start(null, config));
}
