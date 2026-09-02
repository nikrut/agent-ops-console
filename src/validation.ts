import { TARGET_CHAIN_ID, type OpsEvent } from "./types.js";

const SENSITIVE_KEY = /private.?key|mnemonic|seed.?phrase|authorization|payment.?signature|api.?secret|access.?token/i;

export function validateEvent(value: unknown): OpsEvent {
  if (!isRecord(value)) throw new Error("event must be an object");
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(value.id)) throw new Error("event id is invalid");
  if (!["signal", "risk", "execution", "payment", "control"].includes(String(value.type))) throw new Error("event type is invalid");
  if (value.chainId !== TARGET_CHAIN_ID) throw new Error(`chainId must be ${TARGET_CHAIN_ID}`);
  if (!Number.isSafeInteger(value.timestamp) || (value.timestamp as number) < 0) throw new Error("timestamp is invalid");
  if (typeof value.source !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(value.source)) throw new Error("source is invalid");
  if (!isRecord(value.data)) throw new Error("event data must be an object");
  assertSafeData(value.data, 0);
  const encoded = JSON.stringify(value.data);
  if (Buffer.byteLength(encoded, "utf8") > 32_768) throw new Error("event data is too large");
  return value as unknown as OpsEvent;
}

function assertSafeData(value: unknown, depth: number): void {
  if (depth > 8) throw new Error("event data is too deeply nested");
  if (Array.isArray(value)) {
    if (value.length > 1_000) throw new Error("event data array is too large");
    value.forEach((item) => assertSafeData(item, depth + 1));
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) throw new Error(`sensitive field is forbidden: ${key}`);
      assertSafeData(item, depth + 1);
    }
    return;
  }
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("event data contains a non-finite number");
  if (!["string", "number", "boolean", "undefined"].includes(typeof value) && value !== null) {
    throw new Error("event data is not JSON-safe");
  }
  if (typeof value === "string" && value.length > 8_192) throw new Error("event data string is too large");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
