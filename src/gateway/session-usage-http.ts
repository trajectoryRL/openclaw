/**
 * HTTP handler for GET /api/sessions/:key/usage
 *
 * Returns token usage and cost summary for a specific session,
 * identified by session key. Used by ClawBench to retrieve
 * per-episode cost data after an evaluation run.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveDefaultSessionStorePath } from "../config/sessions/paths.js";
import { loadSessionStore } from "../config/sessions/store.js";
import { loadSessionCostSummary } from "../infra/session-cost-usage.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { authorizeGatewayBearerRequestOrReply } from "./http-auth-helpers.js";
import { sendJson } from "./http-common.js";

const SESSION_USAGE_PATH_RE = /^\/api\/sessions\/([a-z0-9][a-z0-9._-]{0,127})\/usage$/i;

type SessionUsageHttpOptions = {
  auth: ResolvedGatewayAuth;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
};

export async function handleSessionUsageHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: SessionUsageHttpOptions,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const match = SESSION_USAGE_PATH_RE.exec(url.pathname);
  if (!match) {
    return false;
  }

  if ((req.method ?? "GET").toUpperCase() !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return true;
  }

  // Auth: reuse the same bearer token as chat completions
  const authorized = await authorizeGatewayBearerRequestOrReply({
    req,
    res,
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    allowRealIpFallback: opts.allowRealIpFallback,
    rateLimiter: opts.rateLimiter,
  });
  if (!authorized) {
    return true; // auth failure response already sent
  }

  const sessionKey = decodeURIComponent(match[1]);

  try {
    const storePath = resolveDefaultSessionStorePath();
    const store = loadSessionStore(storePath, { skipCache: true });
    const sessionEntry = store[sessionKey];
    const costSummary = await loadSessionCostSummary({
      sessionId: sessionKey,
      sessionEntry,
    });
    if (!costSummary) {
      sendJson(res, 404, { error: "Session not found or no usage data" });
      return true;
    }

    const modelUsage = costSummary.modelUsage?.map((m) => ({
      model: m.model,
      provider: m.provider,
      count: m.count,
      input_tokens: m.totals.input,
      output_tokens: m.totals.output,
      cache_read_tokens: m.totals.cacheRead,
      cache_write_tokens: m.totals.cacheWrite,
      cost_usd: m.totals.totalCost,
    }));

    sendJson(res, 200, {
      input_tokens: costSummary.input,
      output_tokens: costSummary.output,
      cache_read_tokens: costSummary.cacheRead,
      cache_write_tokens: costSummary.cacheWrite,
      total_cost_usd: costSummary.totalCost,
      ...(modelUsage && modelUsage.length > 0 ? { model_usage: modelUsage } : {}),
    });
  } catch {
    sendJson(res, 500, { error: "Failed to load session usage" });
  }

  return true;
}
