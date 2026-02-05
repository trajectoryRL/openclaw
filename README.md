# OpenClaw (TrajectoryRL Fork)

Fork of [OpenClaw](https://github.com/openclaw/openclaw) configured as a **mock evaluation environment** for the [TrajectoryRL](https://trajrl.com) project.

This fork is **not intended for general use**. It provides a sandboxed OpenClaw instance with mocked tools for reproducible A/B testing of `AGENTS.md` policies.

## Changes from upstream

### 1. `extensions/trajectory-sandbox-tools/`

An OpenClaw plugin that registers 6 mock tools:

| Tool | Description |
|------|-------------|
| `inbox_list` | List inbox messages from fixtures |
| `email_draft` | Draft a reply (deterministic) |
| `email_send` | Send a draft (logged, no real send) |
| `calendar_read` | Read calendar events from fixtures |
| `memory_read` | Read from mock memory store |
| `memory_write` | Write to mock memory store (logged only) |

Each tool proxies HTTP requests to an external mock server that returns deterministic fixture data.

### 2. `sandbox-config/openclaw.json`

Pre-configured settings that skip onboarding and lock down the tool environment:

- Gateway: LAN bind, token auth, OpenAI-compatible HTTP API enabled
- Tools: all built-in tools denied (`exec`, `browser`, `web_search`, etc.)
- Only mock tools + `read` + `session_status` allowed
- Plugin enabled and pointed at the mock server

### 3. `Dockerfile.trajectory-sandbox`

Custom Docker image that:

- Builds OpenClaw from source
- Bakes in `sandbox-config/openclaw.json` (no interactive setup)
- Starts the gateway with `--allow-unconfigured --bind lan`

## Usage

This fork is used by the [trajectory-sandbox](https://github.com/trajectoryRL/trajectory-sandbox) harness. See that repo for setup and usage instructions.

## Upstream

For the original OpenClaw documentation, see [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw).

## License

Same as upstream: [MIT](LICENSE)
