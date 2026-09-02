import { lstat, mkdir, open, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { auditHash } from "./canonical.js";
import { validateEvent } from "./validation.js";
import type { AuditRecord, OpsEvent } from "./types.js";

const GENESIS = "0".repeat(64);

export class AuditStore {
  #records: AuditRecord[] = [];
  #tail: Promise<unknown> = Promise.resolve();
  constructor(readonly path: string) {}

  async initialize(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    try {
      const stat = await lstat(this.path);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("audit path must be a regular file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    let text = "";
    try { text = await readFile(this.path, "utf8"); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    this.#records = parseAndVerify(text);
  }

  records(): readonly AuditRecord[] { return structuredClone(this.#records); }

  append(eventValue: unknown): Promise<AuditRecord> {
    const run = this.#tail.then(async () => {
      const event = validateEvent(eventValue);
      if (this.#records.some((record) => record.event.id === event.id)) throw new Error("event id already exists");
      const sequence = this.#records.length + 1;
      const previousHash = this.#records.at(-1)?.hash ?? GENESIS;
      const record: AuditRecord = { sequence, previousHash, hash: auditHash(sequence, previousHash, event), event };
      const handle = await open(this.path, "a", 0o600);
      try { await handle.appendFile(`${JSON.stringify(record)}\n`, "utf8"); await handle.sync(); } finally { await handle.close(); }
      this.#records.push(record);
      return structuredClone(record);
    });
    this.#tail = run.catch(() => undefined);
    return run;
  }
}

function parseAndVerify(text: string): AuditRecord[] {
  const records: AuditRecord[] = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (!line) continue;
    let record: AuditRecord;
    try { record = JSON.parse(line) as AuditRecord; } catch { throw new Error(`audit log line ${index + 1} is invalid JSON`); }
    const event = validateEvent(record.event);
    const sequence = records.length + 1;
    const previousHash = records.at(-1)?.hash ?? GENESIS;
    if (record.sequence !== sequence || record.previousHash !== previousHash || record.hash !== auditHash(sequence, previousHash, event)) {
      throw new Error(`audit chain verification failed at sequence ${sequence}`);
    }
    records.push(record);
  }
  return records;
}
