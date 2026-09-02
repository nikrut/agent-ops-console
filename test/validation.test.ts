import { describe, expect, it } from "vitest";
import { validateEvent } from "../src/validation.js";

const valid = { id: "event-0001", type: "risk", chainId: 84_532, timestamp: 1_000, source: "risk-engine", data: { approved: true } };

describe("event validation", () => {
  it("accepts a bounded event for the target chain", () => expect(validateEvent(valid)).toEqual(valid));
  it("rejects another chain", () => expect(() => validateEvent({ ...valid, chainId: 1 })).toThrow("84532"));
  it("rejects nested credential-like fields", () => expect(() => validateEvent({ ...valid, data: { nested: { accessToken: "nope" } } })).toThrow("sensitive field"));
});
