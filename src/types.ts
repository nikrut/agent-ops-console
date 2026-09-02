export const TARGET_CHAIN_ID = 84_532;

export type OpsEventType = "signal" | "risk" | "execution" | "payment" | "control";

export interface OpsEvent {
  id: string;
  type: OpsEventType;
  chainId: typeof TARGET_CHAIN_ID;
  timestamp: number;
  source: string;
  data: Record<string, unknown>;
}

export interface AuditRecord {
  sequence: number;
  previousHash: string;
  hash: string;
  event: OpsEvent;
}

export interface OpsSnapshot {
  paused: boolean;
  totalEvents: number;
  signals: number;
  riskApproved: number;
  riskRejected: number;
  executionsSucceeded: number;
  executionsFailed: number;
  paymentsSettled: number;
  lastEventAt: number | null;
  lastSequence: number;
  chainHead: string;
}
