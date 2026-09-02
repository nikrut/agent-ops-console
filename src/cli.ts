import { createServer } from "node:http";
import { resolve } from "node:path";
import { createOpsHandler } from "./server.js";
import { AuditStore } from "./store.js";

const token = process.env.OPS_TOKEN;
if (!token) throw new Error("OPS_TOKEN is required");
const port = Number(process.env.PORT ?? "4310");
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error("PORT is invalid");
const store = new AuditStore(resolve(process.env.AUDIT_LOG ?? "./data/events.jsonl"));
await store.initialize();
const handler = createOpsHandler(store, token);
createServer((req, res) => void handler(req, res)).listen(port, "127.0.0.1", () => {
  console.log(`Agent Ops Console: http://127.0.0.1:${port}`);
});
