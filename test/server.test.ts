import { createServer, type Server } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOpsHandler } from "../src/server.js";
import { AuditStore } from "../src/store.js";

const token = "local-operator-token-for-tests";

describe("ops HTTP console", () => {
  let server: Server;
  let origin: string;

  beforeEach(async () => {
    const store = new AuditStore(join(await mkdtemp(join(tmpdir(), "ops-http-")), "events.jsonl"));
    await store.initialize();
    const handler = createOpsHandler(store, token);
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server did not bind");
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("starts paused and exposes only aggregate state", async () => {
    const response = await fetch(`${origin}/api/snapshot`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paused: true, totalEvents: 0, lastSequence: 0 });
  });

  it("requires operator auth for mutations", async () => {
    const response = await fetch(`${origin}/api/resume`, { method: "POST" });
    expect(response.status).toBe(401);
  });

  it("records an event and changes control state", async () => {
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const event = { id: "event-http-0001", type: "risk", chainId: 84_532, timestamp: 1_000, source: "risk-engine", data: { approved: false, code: "COOLDOWN" } };
    expect((await fetch(`${origin}/api/events`, { method: "POST", headers, body: JSON.stringify(event) })).status).toBe(201);
    expect((await fetch(`${origin}/api/resume`, { method: "POST", headers })).status).toBe(200);
    expect(await (await fetch(`${origin}/api/snapshot`)).json()).toMatchObject({ paused: false, riskRejected: 1, totalEvents: 2 });
  });
});
