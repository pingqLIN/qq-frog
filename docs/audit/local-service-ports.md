# Local Service Port Registry

狀態：本機治理登記基準。

## Registered Ports

| Port | Binding                                                                        | Service                        | Owner                     | Lifecycle                  | Notes                                                                                                             |
| ---- | ------------------------------------------------------------------------------ | ------------------------------ | ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 8001 | `localhost` by native host; `0.0.0.0` only when explicitly started for LAN use | QQ Frog PDF Translation Bridge | `bridge/server.py`        | Long-running local service | Provides `/`, `/ui`, `/health`, `/pdf/health`, `/pdf/translate-file`, `/v1/chat/completions`, and `/ws`.          |
| 8011 | `127.0.0.1`                                                                    | Temporary bridge smoke test    | Codex/manual verification | Ephemeral only             | Used for isolated HTTP smoke tests so the active `8001` service is not disturbed. Must be stopped after the test. |

## Governance Rules

- `8001` is the only registered long-running QQ Frog local bridge port.
- LAN exposure requires an explicit operator start command with `--host 0.0.0.0`.
- Native Messaging start/stop is limited to localhost bridge URLs.
- Temporary smoke-test ports must not be documented as user-facing endpoints and must be closed after verification.
