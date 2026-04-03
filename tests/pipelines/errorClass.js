// CTGReactStateError typed error class tests

import CTGTest from "ctg-js-test";
import CTGReactStateError from "../../src/CTGReactStateError.js";

// :: OBJECT -> PROMISE(VOID)
export default async function run({ config }) {

    await CTGTest.init("error: construct with type name")
        .stage("create", () => new CTGReactStateError("STRICT_VIOLATION", "not allowed", { key: "count" }))
        .assert("type", (e) => e.type, "STRICT_VIOLATION")
        .assert("code", (e) => e.code, 1001)
        .assert("msg", (e) => e.msg, "not allowed")
        .assert("data", (e) => e.data.key, "count")
        .assert("is Error", (e) => e instanceof Error, true)
        .assert("name", (e) => e.name, "CTGReactStateError")
        .start(null, config);

    await CTGTest.init("error: construct with integer code")
        .stage("create", () => new CTGReactStateError(1000, "bad key"))
        .assert("type resolved", (e) => e.type, "INVALID_KEY")
        .assert("code", (e) => e.code, 1000)
        .start(null, config);

    await CTGTest.init("error: default msg to type name")
        .stage("create", () => new CTGReactStateError("SNAPSHOT_NOT_FOUND"))
        .assert("msg is type name", (e) => e.msg, "SNAPSHOT_NOT_FOUND")
        .assert("data is null", (e) => e.data, null)
        .start(null, config);

    await CTGTest.init("error: unknown type throws TypeError")
        .stage("attempt", () => {
            try { new CTGReactStateError("BOGUS"); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("error: unknown code throws TypeError")
        .stage("attempt", () => {
            try { new CTGReactStateError(9999); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong"; }
        })
        .assert("threw", (r) => r, "threw")
        .start(null, config);

    await CTGTest.init("error: lookup name to code")
        .assert("STRICT_VIOLATION", () => CTGReactStateError.lookup("STRICT_VIOLATION"), 1001)
        .start(null, config);

    await CTGTest.init("error: lookup code to name")
        .assert("1001", () => CTGReactStateError.lookup(1001), "STRICT_VIOLATION")
        .start(null, config);

    await CTGTest.init("error: lookup unknown returns null")
        .assert("string", () => CTGReactStateError.lookup("BOGUS"), null)
        .assert("int", () => CTGReactStateError.lookup(9999), null)
        .start(null, config);

    await CTGTest.init("error: all codes present")
        .stage("collect", () => [
            CTGReactStateError.lookup("INVALID_KEY"),
            CTGReactStateError.lookup("STRICT_VIOLATION"),
            CTGReactStateError.lookup("UNKNOWN_MUTATOR"),
            CTGReactStateError.lookup("MIDDLEWARE_ERROR"),
            CTGReactStateError.lookup("SNAPSHOT_NOT_FOUND"),
            CTGReactStateError.lookup("SNAPSHOT_ERROR"),
            CTGReactStateError.lookup("INVALID_BINDING"),
            CTGReactStateError.lookup("INVALID_CONFIG"),
        ])
        .assert("codes", (r) => JSON.stringify(r),
            JSON.stringify([1000, 1001, 1002, 1003, 2000, 2001, 3000, 3001]))
        .start(null, config);
}
