# Agent Ops Console

A local control plane for bounded trading agents targeting a Sepolia L2 (chain ID `84532`). It accepts operational events, builds a tamper-evident hash chain, shows a read-only dashboard, and exposes authenticated pause/resume controls.

It does **not** hold wallet keys, sign transactions, broadcast calls, or replace onchain budget enforcement.

## What it provides

- Append-only JSONL audit log with SHA-256 links between records.
- Startup verification that detects edited, inserted, or reordered records and deletions inside the retained chain.
- Strict event schema fixed to chain ID `84532`.
- Rejection of credential-like fields before anything reaches disk.
- Aggregated signal, risk, execution, payment, and control metrics.
- Fail-safe startup state: an agent is paused until an authenticated resume event exists.
- Localhost-only server with constant-time bearer-token comparison and bounded request bodies.
- Server-rendered dashboard with no client JavaScript.

## Quick start

Requires Node.js 22+ and pnpm.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
export OPS_TOKEN='replace-with-at-least-24-random-characters'
pnpm dev
```

Open `http://127.0.0.1:4310` for the dashboard.

Resume planning:

```bash
curl -X POST http://127.0.0.1:4310/api/resume \
  -H "Authorization: Bearer $OPS_TOKEN"
```

Append an event:

```bash
curl -X POST http://127.0.0.1:4310/api/events \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"id":"risk-00000001","type":"risk","chainId":84532,"timestamp":1772400000000,"source":"risk-engine","data":{"approved":false,"code":"COOLDOWN"}}'
```

## API

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | none, localhost only | Aggregate dashboard |
| `GET` | `/health` | none | Liveness and chain ID |
| `GET` | `/api/snapshot` | none, localhost only | Machine-readable aggregates |
| `POST` | `/api/events` | bearer token | Append a validated event |
| `POST` | `/api/pause` | bearer token | Append a pause control event |
| `POST` | `/api/resume` | bearer token | Append a resume control event |

Agent executors should poll the snapshot and also retain their own independent fail-closed safeguards. A local pause flag is operational defense in depth, not an onchain kill switch.

## Limits

- One process owns one log file; shared/network filesystems are unsupported.
- The hash chain is tamper-evident, not tamper-proof: anchor chain heads externally for stronger assurance.
- The dashboard intentionally exposes only aggregates, but localhost access should still be treated as sensitive.
- This MVP has not received an independent security audit.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`SECURITY.md`](SECURITY.md).

## License

MIT. See [`LICENSE`](LICENSE).
