// Ensure proxyFetch is loaded to patch globalThis.fetch (same as other usage routes)
import "open-sse/index.js";

import { getProviderConnections } from "@/lib/localDb";
import { getUsageForProvider } from "open-sse/services/usage.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import { USAGE_APIKEY_PROVIDERS, AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";
// Reuse the exact credential-refresh + proxy resolution logic of the per-connection route
import { refreshAndUpdateCredentials } from "../[connectionId]/route";

export const dynamic = "force-dynamic";

// Short-lived in-memory cache: quota endpoints are rate-sensitive.
const CACHE_TTL_MS = 45_000;
let cache = { at: 0, data: null };
const MAX_CONCURRENCY = 6;

function isEligible(connection) {
  const isOAuth = connection.authType === "oauth";
  const isApikeyAuth = connection.authType === "apikey" || connection.authType === "api_key";
  const isApikeyEligible = isApikeyAuth && USAGE_APIKEY_PROVIDERS.includes(connection.provider);
  return isOAuth || isApikeyEligible;
}

// Sum remaining credits from a raw provider usage payload.
function sumRemaining(usage) {
  let remaining = 0;
  let total = 0;
  let unlimited = false;
  const quotas = usage?.quotas;
  if (quotas && typeof quotas === "object") {
    const entries = Array.isArray(quotas) ? quotas : Object.values(quotas);
    for (const q of entries) {
      if (!q || typeof q !== "object") continue;
      if (q.unlimited) { unlimited = true; continue; }
      const t = Number(q.total) || 0;
      const u = Number(q.used) || 0;
      total += t;
      remaining += Math.max(0, t - u);
    }
  }
  return { remaining, total, unlimited };
}

async function fetchUsage(connection) {
  try {
    const proxyConfig = await resolveConnectionProxyConfig(connection.providerSpecificData);
    const proxyOptions = {
      connectionProxyEnabled: proxyConfig.connectionProxyEnabled === true,
      connectionProxyUrl: proxyConfig.connectionProxyUrl || "",
      connectionNoProxy: proxyConfig.connectionNoProxy || "",
      vercelRelayUrl: proxyConfig.vercelRelayUrl || "",
      strictProxy: false,
    };

    let conn = connection;
    if (conn.authType === "oauth") {
      try {
        const r = await refreshAndUpdateCredentials(conn, false, proxyOptions);
        conn = r.connection;
      } catch { /* keep going with existing token */ }
    }

    const usage = await getUsageForProvider(conn, proxyOptions);
    const { remaining, total, unlimited } = sumRemaining(usage);
    return { ok: true, remaining, total, unlimited, plan: usage?.plan || null, message: usage?.message || null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Bounded-concurrency map
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * GET /api/usage/pool
 * Aggregates remaining credits across ALL accounts of each provider (a "credit pool" view).
 */
export async function GET() {
  try {
    if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
      return Response.json({ ...cache.data, cached: true });
    }

    const all = (await getProviderConnections()).filter(isEligible);

    const byProvider = new Map();
    for (const c of all) {
      if (!byProvider.has(c.provider)) byProvider.set(c.provider, []);
      byProvider.get(c.provider).push(c);
    }

    const providers = [];
    for (const [providerId, conns] of byProvider.entries()) {
      const results = await mapLimit(conns, MAX_CONCURRENCY, (c) =>
        fetchUsage(c).then((r) => ({ ...r, name: c.name || c.email || c.id }))
      );

      let remaining = 0, total = 0, unlimited = false, failed = 0;
      const accounts = [];
      for (const r of results) {
        if (r.ok) {
          remaining += r.remaining; total += r.total; unlimited = unlimited || r.unlimited;
        } else {
          failed++;
        }
        accounts.push({ name: r.name, ok: r.ok, remaining: r.ok ? r.remaining : null, plan: r.plan || null, error: r.ok ? null : r.error });
      }

      const cfg = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
      providers.push({
        id: providerId,
        name: cfg?.name || providerId,
        accounts: accounts.length,
        activeAccounts: conns.filter((c) => c.isActive).length,
        remaining,
        total,
        unlimited,
        failed,
        breakdown: accounts,
      });
    }

    providers.sort((a, b) => b.remaining - a.remaining);
    const totalRemaining = providers.reduce((s, p) => s + p.remaining, 0);
    const data = { providers, totalRemaining, updatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data };
    return Response.json({ ...data, cached: false });
  } catch (error) {
    console.error("[Usage/Pool] Failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
