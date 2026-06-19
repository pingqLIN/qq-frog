# Local Service Port Registry

狀態：本機治理登記基準。

## Registered Ports

| Port | Binding                                                                                             | Service                        | Owner                     | Lifecycle                  | Notes                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 8001 | `127.0.0.1` by native host / `python server.py`; `0.0.0.0` only when explicitly started for LAN use | QQ Frog PDF Translation Bridge | `bridge/server.py`        | Long-running local service | Provides `/`, `/ui`, `/health`, `/pdf/health`, `/pdf/translate-file`, `/v1/chat/completions`, and `/ws`.          |
| 8011 | `127.0.0.1`                                                                                         | Temporary bridge smoke test    | Codex/manual verification | Ephemeral only             | Used for isolated HTTP smoke tests so the active `8001` service is not disturbed. Must be stopped after the test. |

## Governance Rules

- `8001` is the only registered long-running QQ Frog local bridge port.
- LAN exposure requires an explicit operator start command with `--host 0.0.0.0`.
- Native Messaging start/stop is limited to localhost bridge URLs.
- Native Messaging stop only terminates a process that matches the native host JSON PID record and this repo's `bridge/server.py` command line.
- CORS defaults to local browser origins plus Chrome extension origins. Wider Web CORS requires `QQ_FROG_BRIDGE_CORS_ORIGINS` and should be reserved for controlled LAN/testing use.
- Temporary smoke-test ports must not be documented as user-facing endpoints and must be closed after verification.
