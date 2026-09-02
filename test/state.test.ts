import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../src/state.js";
import type { AuditRecord, OpsEvent } from "../src/types.js";

const record = (sequence: number, type: OpsEvent["type"], data: Record<string, unknown>): AuditRecord => ({
  sequence, previousHash: "a", hash: `hash-${sequence}`,
  event: { id: `event-${sequence}xxxx`, type, chainId: 84_532, timestamp: sequence, source: "test", data }
});

it("reduces operational events into a useful snapshot", () => {
  const snapshot = buildSnapshot([
    record(1, "signal", {}), record(2, "risk", { approved: true }), record(3, "risk", { approved: false }),
    record(4, "execution", { success: true }), record(5, "payment", { settled: true }), record(6, "control", { paused: false })
  ]);
  expect(snapshot).toMatchObject({ paused: false, totalEvents: 6, signals: 1, riskApproved: 1, riskRejected: 1, executionsSucceeded: 1, paymentsSettled: 1 });
  expect(snapshot.chainHead).toBe("hash-6");
});
