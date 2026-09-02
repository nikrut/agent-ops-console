import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildSnapshot } from "./state.js";
import type { AuditStore } from "./store.js";
import { TARGET_CHAIN_ID } from "./types.js";

const MAX_BODY = 65_536;

export function createOpsHandler(store: AuditStore, operatorToken: string) {
  if (operatorToken.length < 24) throw new Error("operator token must contain at least 24 characters");
  const expectedTokenHash = createHash("sha256").update(operatorToken).digest();

  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setHeaders(res);
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, chainId: TARGET_CHAIN_ID });
    if (req.method === "GET" && url.pathname === "/api/snapshot") return json(res, 200, buildSnapshot(store.records()));
    if (req.method === "GET" && url.pathname === "/") return html(res, dashboard(buildSnapshot(store.records())));
    if (req.method !== "POST") return json(res, 404, { error: "not found" });
    if (!authorized(req.headers.authorization, expectedTokenHash)) return json(res, 401, { error: "unauthorized" }, { "www-authenticate": "Bearer" });

    try {
      if (url.pathname === "/api/events") {
        const record = await store.append(JSON.parse(await readBody(req)));
        return json(res, 201, { sequence: record.sequence, hash: record.hash });
      }
      if (url.pathname === "/api/pause" || url.pathname === "/api/resume") {
        const paused = url.pathname.endsWith("pause");
        const record = await store.append({
          id: randomUUID(), type: "control", chainId: TARGET_CHAIN_ID, timestamp: Date.now(), source: "operator", data: { paused }
        });
        return json(res, 200, { paused, sequence: record.sequence, hash: record.hash });
      }
      return json(res, 404, { error: "not found" });
    } catch (error) {
      const message = error instanceof SyntaxError ? "invalid JSON" : error instanceof Error ? error.message : "invalid request";
      return json(res, 400, { error: message });
    }
  };
}

function authorized(header: string | undefined, expected: Buffer): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = createHash("sha256").update(header.slice(7)).digest();
  return timingSafeEqual(actual, expected);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY) throw new Error("request body is too large");
    chunks.push(buffer);
  }
  if (size === 0) throw new Error("request body is required");
  return Buffer.concat(chunks).toString("utf8");
}

function setHeaders(res: ServerResponse): void {
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
}

function json(res: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
  Object.entries(headers).forEach(([name, header]) => res.setHeader(name, header));
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

function html(res: ServerResponse, value: string): void {
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(value);
}

function dashboard(snapshot: ReturnType<typeof buildSnapshot>): string {
  const rows = [
    ["Agent state", snapshot.paused ? "PAUSED" : "ACTIVE"],
    ["Events", snapshot.totalEvents], ["Signals", snapshot.signals],
    ["Risk approved", snapshot.riskApproved], ["Risk rejected", snapshot.riskRejected],
    ["Executions succeeded", snapshot.executionsSucceeded], ["Executions failed", snapshot.executionsFailed],
    ["Payments settled", snapshot.paymentsSettled], ["Audit sequence", snapshot.lastSequence],
    ["Chain head", snapshot.chainHead || "genesis"]
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="10"><title>Agent Ops Console</title><style>body{font:16px system-ui;max-width:760px;margin:3rem auto;padding:0 1rem;background:#0b1020;color:#e8eefc}h1{color:#80cbc4}table{width:100%;border-collapse:collapse;background:#141b2d}td{padding:.8rem;border-bottom:1px solid #29324a}td:last-child{text-align:right;font-family:monospace;word-break:break-all}.note{color:#9eabc7}</style></head><body><h1>Agent Ops Console</h1><p class="note">Local read-only dashboard · chain ${TARGET_CHAIN_ID} · refreshes every 10 seconds</p><table>${rows.map(([key,value])=>`<tr><td>${key}</td><td>${String(value)}</td></tr>`).join("")}</table></body></html>`;
}
