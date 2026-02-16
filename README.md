# OpenClaw (TrajectoryRL Fork)

Fork of [OpenClaw](https://github.com/openclaw/openclaw) configured as a **mock evaluation environment** for the [TrajectoryRL](https://trajrl.com) project.

This fork is **not intended for general use**. It provides a sandboxed OpenClaw instance with a comprehensive mock tool library for reproducible A/B testing of `AGENTS.md` policies.

## Changes from upstream

### 1. `extensions/clawbench-tools/`

An OpenClaw plugin that registers **25 mock tools** across 8 categories:

| Category | Tools | Count |
|----------|-------|-------|
| **Email & Inbox** | `inbox_list`, `email_read`, `email_draft`, `email_send`, `email_archive` | 5 |
| **Calendar** | `calendar_read`, `calendar_create`, `calendar_update`, `calendar_delete` | 4 |
| **Messaging (Slack)** | `slack_list_channels`, `slack_read_messages`, `slack_post_message`, `slack_send_dm` | 4 |
| **Tasks (Jira/Linear)** | `task_list`, `task_get`, `task_create`, `task_update` | 4 |
| **Documents (Drive/Notion)** | `doc_list`, `doc_read`, `doc_create` | 3 |
| **Contacts** | `contacts_list`, `contacts_get` | 2 |
| **Memory / Notes** | `memory_read`, `memory_write` | 2 |
| **Web Search** | `search_web` | 1 |

Each tool proxies HTTP requests to an external mock server that returns deterministic fixture data. The plugin always registers **all** tools — scenarios control which subset is active via the `tools.allow` config.

### 2. `sandbox-config/openclaw.json`

Pre-configured settings that skip onboarding and lock down the tool environment:

- Gateway: LAN bind, token auth, OpenAI-compatible HTTP API enabled
- Tools: all built-in tools denied (`exec`, `browser`, `web_search`, etc.)
- All 25 mock tools + `read` + `session_status` allowed (base config)
- Plugin enabled and pointed at the mock server

The model is controlled by the `CLAWBENCH_MODEL` env var (default: `anthropic/claude-sonnet-4-5-20250929`). The config uses `${CLAWBENCH_MODEL}` as a placeholder, resolved at container startup. See [ClawBench docs](https://github.com/trajectoryRL/clawbench#model-configuration) for local LLM setup.

**Note:** In practice, the clawbench harness generates a scenario-specific `openclaw.json` at runtime that only allows the tools needed for that scenario. The base config here is a fallback that allows everything.

### 3. `Dockerfile.clawbench`

Custom Docker image that:

- Builds OpenClaw from source
- Bakes in `sandbox-config/openclaw.json` (no interactive setup)
- Starts the gateway with `--allow-unconfigured --bind lan`

## Usage

This fork is used by the [clawbench](https://github.com/trajectoryRL/clawbench) harness. See that repo for setup and usage instructions.

## Upstream

For the original OpenClaw documentation, see [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw).

## License

Same as upstream: [MIT](LICENSE)
