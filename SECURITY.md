# Security Policy

## Intended boundary

This service binds to `127.0.0.1`, stores no wallet credentials, and accepts mutation only with a local operator token. It is an observability and coordination layer, not an authorization substitute for the onchain vault.

## Operational requirements

- Generate a unique random `OPS_TOKEN` and pass it through process configuration.
- Keep the data directory local, private, and backed up.
- Do not place the service behind a public reverse proxy without separate authentication, TLS, CSRF analysis, and rate limiting.
- Stop on any startup audit-chain error; do not repair history in place.
- Anchor audit chain heads outside the host if evidence against host compromise is required.
- Keep production secrets out of event payloads even though common secret field names are rejected.

This MVP has not received an independent security audit. Report suspected vulnerabilities with a private GitHub security advisory.
