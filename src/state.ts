import type { AuditRecord, OpsSnapshot } from "./types.js";

export function buildSnapshot(records: readonly AuditRecord[]): OpsSnapshot {
  const snapshot: OpsSnapshot = {
    paused: true, totalEvents: records.length, signals: 0, riskApproved: 0, riskRejected: 0,
    executionsSucceeded: 0, executionsFailed: 0, paymentsSettled: 0, lastEventAt: null,
    lastSequence: records.at(-1)?.sequence ?? 0, chainHead: records.at(-1)?.hash ?? "0".repeat(64)
  };
  for (const { event } of records) {
    snapshot.lastEventAt = event.timestamp;
    if (event.type === "signal") snapshot.signals += 1;
    if (event.type === "risk") event.data.approved === true ? snapshot.riskApproved += 1 : snapshot.riskRejected += 1;
    if (event.type === "execution") event.data.success === true ? snapshot.executionsSucceeded += 1 : snapshot.executionsFailed += 1;
    if (event.type === "payment" && event.data.settled === true) snapshot.paymentsSettled += 1;
    if (event.type === "control" && typeof event.data.paused === "boolean") snapshot.paused = event.data.paused;
  }
  return snapshot;
}
