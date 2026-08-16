import { CTGReactStateError } from "ctg-react-state";

const strictCode: 1001 = CTGReactStateError.lookup("STRICT_VIOLATION");
const strictType: "STRICT_VIOLATION" = CTGReactStateError.lookup(1001);
const missing: string | number | null = CTGReactStateError.lookup("UNKNOWN");

const err = new CTGReactStateError(3001, "bad config", { key: "strict" });

err.name.toUpperCase();
err.message.toUpperCase();
err.type.toLowerCase();
err.code.toFixed(0);
err.msg.toUpperCase();
err.data;

// @ts-expect-error constructor accepts known names or codes only
new CTGReactStateError(9999);
