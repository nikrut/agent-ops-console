import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuditStore } from "../src/store.js";

const event = (id: string) => ({ id, type: "signal", chainId: 84_532, timestamp: 1_000, source: "strategy", data: { direction: "hold" } });

describe("audit store", () => {
  it("appends and reloads a verified hash chain", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "ops-store-")), "events.jsonl");
    const store = new AuditStore(path);
    await store.initialize();
    const first = await store.append(event("event-0001"));
    const second = await store.append(event("event-0002"));
    expect(second.previousHash).toBe(first.hash);
    const reloaded = new AuditStore(path);
    await reloaded.initialize();
    expect(reloaded.records()).toHaveLength(2);
  });

  it("detects historical tampering", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "ops-tamper-")), "events.jsonl");
    const store = new AuditStore(path);
    await store.initialize();
    await store.append(event("event-0001"));
    const text = (await readFile(path, "utf8")).replace("hold", "sell");
    await writeFile(path, text);
    await expect(new AuditStore(path).initialize()).rejects.toThrow("chain verification failed");
  });

  it("rejects duplicate ids and sensitive fields", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "ops-safe-")), "events.jsonl");
    const store = new AuditStore(path);
    await store.initialize();
    await store.append(event("event-0001"));
    await expect(store.append(event("event-0001"))).rejects.toThrow("already exists");
    await expect(store.append({ ...event("event-0002"), data: { privateKey: "forbidden" } })).rejects.toThrow("sensitive field");
  });
});
