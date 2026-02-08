/**
 * Trajectory Sandbox Tools — OpenClaw Plugin (Corrected Schema)
 *
 * Registers mock tools that match the REAL OpenClaw tool surface:
 *   - slack       (single tool with action param, matching slack-actions.ts)
 *   - exec        (shell execution, pattern-matches himalaya/curl/gh commands)
 *   - memory_search / memory_get  (matching memory-tool.ts)
 *   - web_search / web_fetch      (matching web-search.ts / web-fetch.ts)
 *
 * Each tool proxies to a mock server that returns deterministic fixture data.
 * The tool schemas the LLM sees are identical to production OpenClaw.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginConfig {
  mockServerUrl?: string;
  scenario?: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------------------------------------------------------------------
// Tool Catalog — matches real OpenClaw tool schemas
// ---------------------------------------------------------------------------

const TOOLS: ToolDefinition[] = [
  // -- Slack (single tool with action param, matching slack-actions.ts) ------
  {
    name: "slack",
    description:
      "Interact with Slack. Supports actions: readMessages, sendMessage, " +
      "editMessage, deleteMessage, react, reactions, pinMessage, unpinMessage, " +
      "listPins, memberInfo, emojiList.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description:
            "The Slack action to perform.",
          enum: [
            "readMessages",
            "sendMessage",
            "editMessage",
            "deleteMessage",
            "react",
            "reactions",
            "pinMessage",
            "unpinMessage",
            "listPins",
            "memberInfo",
            "emojiList",
          ],
        },
        // sendMessage params
        to: {
          type: "string",
          description:
            'Channel ID, user ID, or prefixed target (e.g. "C123", "user:U456", "channel:C123").',
        },
        content: {
          type: "string",
          description: "Message text to send.",
        },
        threadTs: {
          type: "string",
          description: "Thread timestamp for replies.",
        },
        // readMessages params
        channelId: {
          type: "string",
          description: "Channel ID to read from.",
        },
        limit: {
          type: "number",
          description: "Max messages to return.",
        },
        before: {
          type: "string",
          description: "Message timestamp cursor (before).",
        },
        after: {
          type: "string",
          description: "Message timestamp cursor (after).",
        },
        threadId: {
          type: "string",
          description: "Thread ID to read from.",
        },
        // editMessage / deleteMessage params
        messageId: {
          type: "string",
          description: "Message timestamp to edit/delete/react/pin.",
        },
        // react params
        emoji: {
          type: "string",
          description: 'Emoji name without colons (e.g. "thumbsup").',
        },
        remove: {
          type: "boolean",
          description: "If true, removes the reaction instead of adding.",
        },
        // memberInfo params
        userId: {
          type: "string",
          description: "Slack user ID for memberInfo.",
        },
      },
      required: ["action"],
    },
  },

  // -- Exec (shell execution, matching bash-tools.exec.ts) ------------------
  {
    name: "exec",
    description:
      "Execute shell commands. Use for CLI tools (himalaya for email, " +
      "curl for Notion/Google Calendar APIs, gh for GitHub).",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute.",
        },
        workdir: {
          type: "string",
          description: "Working directory (defaults to cwd).",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds.",
        },
        background: {
          type: "boolean",
          description: "Run in background immediately.",
        },
      },
      required: ["command"],
    },
  },

  // -- Memory Search (matching memory-tool.ts) ------------------------------
  {
    name: "memory_search",
    description:
      "Mandatory recall step: semantically search MEMORY.md + memory/*.md " +
      "before answering questions about prior work, decisions, dates, people, " +
      "preferences, or todos; returns top snippets with path + lines.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Semantic search query.",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return.",
        },
        minScore: {
          type: "number",
          description: "Minimum relevance score threshold.",
        },
      },
      required: ["query"],
    },
  },

  // -- Memory Get (matching memory-tool.ts) ---------------------------------
  {
    name: "memory_get",
    description:
      "Safe snippet read from MEMORY.md or memory/*.md with optional " +
      "from/lines; use after memory_search to pull only the needed lines.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to memory file.",
        },
        from: {
          type: "number",
          description: "Starting line number.",
        },
        lines: {
          type: "number",
          description: "Number of lines to read.",
        },
      },
      required: ["path"],
    },
  },

  // -- Web Search (matching web-search.ts, Brave provider) ------------------
  {
    name: "web_search",
    description:
      "Search the web. Returns titles, URLs, and snippets.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string.",
        },
        count: {
          type: "number",
          description: "Number of results to return (1-10).",
        },
        country: {
          type: "string",
          description:
            "2-letter country code for region-specific results (e.g. 'US').",
        },
        freshness: {
          type: "string",
          description:
            "Filter by time: 'pd' (24h), 'pw' (week), 'pm' (month), 'py' (year).",
        },
      },
      required: ["query"],
    },
  },

  // -- Web Fetch (matching web-fetch.ts) ------------------------------------
  {
    name: "web_fetch",
    description:
      "Fetch and extract readable content from a URL (HTML to markdown/text).",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "HTTP or HTTPS URL to fetch.",
        },
        extractMode: {
          type: "string",
          description: 'Extraction mode ("markdown" or "text").',
          enum: ["markdown", "text"],
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return.",
        },
      },
      required: ["url"],
    },
  },

  // -- Read (matching read tool for workspace files) ------------------------
  {
    name: "read",
    description: "Read the contents of a file by path.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or workspace-relative file path to read.",
        },
        from: {
          type: "number",
          description: "Starting line number.",
        },
        lines: {
          type: "number",
          description: "Number of lines to read.",
        },
      },
      required: ["path"],
    },
  },
];

// ---------------------------------------------------------------------------
// Plugin helpers
// ---------------------------------------------------------------------------

function getPluginConfig(api: OpenClawPluginApi): PluginConfig {
  const entries = api.config.plugins?.entries as
    | Record<string, { config?: PluginConfig }>
    | undefined;
  return entries?.["trajectory-sandbox-tools"]?.config ?? {};
}

async function callMockServer(
  config: PluginConfig,
  endpoint: string,
  body: Record<string, unknown> = {},
  logger?: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<unknown> {
  const baseUrl = config.mockServerUrl ?? "http://localhost:3001";
  const url = `${baseUrl}${endpoint}`;
  const bodyStr = JSON.stringify(body);

  logger?.info(`[mock-call] POST ${endpoint} body=${bodyStr}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(no body)");
    logger?.warn(
      `[mock-call] FAILED ${endpoint} status=${response.status} response=${errorText}`,
    );
    throw new Error(
      `Mock server error: ${response.status} ${response.statusText} — ${errorText}`,
    );
  }

  const result = await response.json();
  logger?.info(
    `[mock-call] OK ${endpoint} result=${JSON.stringify(result).slice(0, 200)}`,
  );
  return result;
}

/**
 * Extract params from OpenClaw's execute() calling convention.
 *   execute(toolCallId: string, params: object, context: object, unknown)
 */
function extractParams(
  args: unknown[],
  logger?: { warn: (msg: string) => void },
): Record<string, unknown> {
  if (args.length === 0) return {};

  if (typeof args[0] === "string" && args.length >= 2) {
    const params = args[1];
    if (
      params !== null &&
      params !== undefined &&
      typeof params === "object" &&
      !Array.isArray(params)
    ) {
      return params as Record<string, unknown>;
    }
    return {};
  }

  const first = args[0];
  if (
    first !== null &&
    first !== undefined &&
    typeof first === "object" &&
    !Array.isArray(first)
  ) {
    return first as Record<string, unknown>;
  }

  logger?.warn("[params-debug] unexpected args shape — returning empty");
  return {};
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const trajectorySandboxPlugin = {
  id: "trajectory-sandbox-tools",
  name: "Trajectory Sandbox Tools",
  description:
    "Mock tools matching real OpenClaw tool schemas (slack, exec, memory, web_search, web_fetch, read) for trajectory sandbox evaluation",
  configSchema: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      mockServerUrl: {
        type: "string" as const,
        default: "http://localhost:3001",
        description: "URL of the mock tools server",
      },
      scenario: {
        type: "string" as const,
        default: "inbox_triage",
        description: "Current scenario name for fixtures",
      },
    },
  },

  register(api: OpenClawPluginApi) {
    api.logger.info("Trajectory Sandbox Tools plugin loading (corrected schema v0.3.0)...");

    const pluginConfig = getPluginConfig(api);

    for (const tool of TOOLS) {
      const toolName = tool.name;

      api.registerTool(
        {
          name: toolName,
          description: tool.description,
          parameters: {
            type: "object" as const,
            properties: tool.parameters.properties as Record<string, unknown>,
            ...(tool.parameters.required
              ? { required: tool.parameters.required }
              : {}),
          },
          async execute(...args: unknown[]) {
            const params = extractParams(args, api.logger);

            // Route to the mock server with tool name as endpoint
            const endpoint = `/tools/${toolName}`;
            const result = await callMockServer(
              pluginConfig,
              endpoint,
              params,
              api.logger,
            );
            return {
              content: [
                { type: "text" as const, text: JSON.stringify(result, null, 2) },
              ],
            };
          },
        },
        { names: [toolName] },
      );
    }

    api.logger.info(
      `Trajectory Sandbox Tools plugin loaded: ${TOOLS.length} tools registered ` +
        `(${TOOLS.map((t) => t.name).join(", ")})`,
    );
  },
};

export default trajectorySandboxPlugin;
