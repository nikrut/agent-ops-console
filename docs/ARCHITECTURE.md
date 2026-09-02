# Architecture

```text
strategy / risk / executor / payment gateway
                    |
                    | authenticated event
                    v
          validation + secret rejection
                    |
                    v
       append + fsync + SHA-256 hash link
                    |
              JSONL audit log
                    |
          reducer --+-- dashboard
                    +-- snapshot API
                    +-- pause gate
```

## Audit record

Every record contains a sequence, previous hash, event, and hash. The hash covers a canonical serialization of the event plus sequence and previous hash. The retained chain is verified before the server starts. Detecting removal of records from the end requires comparing the chain head with an external anchor.

## Failure behavior

- Empty history means paused.
- Invalid or tampered history prevents startup.
- A duplicate event ID is rejected.
- Events for another chain are rejected.
- Credential-like fields are rejected recursively.
- Failed writes never enter in-memory state.
- Mutating routes require a bearer token of at least 24 characters.

## Integration

The strategy engine can emit `signal` and `risk` events, the vault executor can emit `execution` events, and the x402 gateway can emit `payment` events. Keep the token in process configuration, never in an event.
