import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { priorityChannels as priorityChannelsTable, messages } from "@/db/schema";
import type { 
  ConversationsHistoryResponse, 
  ConversationsHistoryArguments,
  ConversationsRepliesResponse,
  ConversationsRepliesArguments,
} from "@slack/web-api";
import { eq } from "drizzle-orm";

// Gather numbered tokens: SLACK_TOKEN_CONVHISTORY1, 2, 3, ...
const getTokens = (): string[] => {
  const tokens: string[] = [];
  let i = 1;
  while (process.env[`SLACK_TOKEN_CONVHISTORY${i}`]) {
    tokens.push(process.env[`SLACK_TOKEN_CONVHISTORY${i}`]!);
    i++;
  }
  return tokens.filter(Boolean);
};

const tokens = getTokens();
const clients = tokens.map(token => new WebClient(token));
let currentClientIndex = 0;

// Priority token and channels
const priorityToken = process.env.SLACK_TOKEN_CONVHISTORY_PRIORITY;
const priorityClient = priorityToken ? new WebClient(priorityToken) : null;
// Load priority channels from env and DB
const priorityChannels = new Set<string>();

// Add from env if still provided (backward compatibility)
(process.env.SLACK_CONVHISTORY_PRIORITY_CHANNELS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .forEach((id) => priorityChannels.add(id));

// Async load from DB
(async () => {
  try {
    const rows = await db
      .select({ channelId: priorityChannelsTable.channelId })
      .from(priorityChannelsTable);
    rows.forEach((r) => priorityChannels.add(r.channelId));
  } catch (err) {
    console.error("Failed to load priority channels from DB:", err);
  }
})();

// Public helper to register a new priority channel at runtime
export async function registerPriorityChannel(channelId: string) {
  if (!channelId) return;
  if (!priorityChannels.has(channelId)) {
    priorityChannels.add(channelId);
    try {
      await db
        .insert(priorityChannelsTable)
        .values({ channelId, channelName: channelId })
        .onConflictDoNothing();
    } catch (err) {
      console.error("Error saving priority channel to DB:", err);
    }
  }
}

if (clients.length === 0 && !priorityClient) {
  console.warn(
    "No Slack conversation history tokens found. Please set SLACK_TOKEN_CONVHISTORYn and/or SLACK_TOKEN_CONVHISTORY_PRIORITY."
  );
}

// Helper to handle Slack style errors in a type-safe way
const isRateLimited = (error: unknown): { retryAfter?: number } | null => {
  const err = error as { data?: { error?: string }; response?: { headers?: { "retry-after"?: string } } };
  if (err?.data?.error === "ratelimited") {
    const retryAfterHeader = err.response?.headers?.["retry-after"];
    return { retryAfter: retryAfterHeader ? parseInt(String(retryAfterHeader), 10) * 1000 : undefined };
  }
  return null;
};

// Lightweight in-memory cache for channelId -> channelName lookups
const channelNameCache = new Map<string, string>();

/**
 * Attempt to resolve a channel name for a given channel ID without invoking the Slack API.
 * The lookup is performed against the local database (messages table) and the result is
 * cached for the remainder of the process lifetime.
 */
async function getChannelName(channelId?: string): Promise<string | null> {
  if (!channelId) return null;
  if (channelNameCache.has(channelId)) return channelNameCache.get(channelId)!;

  try {
    const [row] = await db
      .select({ channelName: messages.channelName })
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .limit(1);

    if (row?.channelName) {
      channelNameCache.set(channelId, row.channelName);
      return row.channelName;
    }
  } catch (err) {
    console.error("[slack-cycler] Failed to fetch channel name from DB:", err);
  }

  return null;
}

async function executeWithTokenCycling<T>(
  apiCall: (client: WebClient) => Promise<T>,
  channelId?: string,
  maxRetries = 5,
  retryDelay = 60000
): Promise<T> {
  if (clients.length === 0 && !priorityClient) {
    throw new Error("No Slack tokens configured for conversation history.");
  }

  const shouldUsePriorityFirst = priorityClient && channelId && priorityChannels.has(channelId);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. Try priority token first if applicable
    if (shouldUsePriorityFirst && priorityClient) {
      try {
        console.log(`[slack-cycler] Using priority token for channel ${channelId ?? "?"}`);
        return await apiCall(priorityClient);
      } catch (error: unknown) {
        const rateInfo = isRateLimited(error);
        if (rateInfo) {
          const waitMs = rateInfo.retryAfter ?? 1000;
          const channelName = await getChannelName(channelId);
          const channelLabel = channelName ? `#${channelName} (${channelId})` : channelId ?? "?";
          console.warn(
            `[slack-cycler] Rate limited on priority token for channel ${channelLabel} (retry-after ${waitMs}ms). Falling back to pooled tokens.`
          );
          await new Promise(res => setTimeout(res, waitMs));
        } else {
          console.error("[slack-cycler] Priority token failed:", error);
        }
      }
    }

    // 2. Cycle through pooled tokens
    for (let i = 0; i < clients.length; i++) {
      const client = clients[currentClientIndex];
      const clientIndexForLogging = currentClientIndex;
      currentClientIndex = (currentClientIndex + 1) % clients.length;

      try {
        console.log(`[slack-cycler] Using pooled token index ${clientIndexForLogging}`);
        return await apiCall(client);
      } catch (error: unknown) {
        const rateInfo = isRateLimited(error);

        if (rateInfo) {
          const waitMs = rateInfo.retryAfter ?? 1000;
          const channelName = await getChannelName(channelId);
          const channelLabel = channelName ? `#${channelName} (${channelId})` : channelId ?? "?";
          console.warn(
            `[slack-cycler] Rate limited on token index ${clientIndexForLogging} for channel ${channelLabel}. Waiting ${waitMs}ms then switching to index ${currentClientIndex}.`
          );
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          const err = error as { data?: { error?: string } };
          if (err?.data?.error) {
            console.error(
              `[slack-cycler] Slack API error on token index ${clientIndexForLogging}: ${err.data.error}. Switching to index ${currentClientIndex}.`
            );
          } else {
            console.error(
              `[slack-cycler] Unexpected error on token index ${clientIndexForLogging}. Next token index ${currentClientIndex}.`,
              error
            );
          }
        }
      }
    }

    if (attempt < maxRetries) {
      console.log(
        `[slack-cycler] All tokens failed for attempt ${attempt}/${maxRetries}. Retrying in ${retryDelay / 1000}s.`
      );
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`[slack-cycler] All Slack API call attempts failed after ${maxRetries} rounds.`);
}

// ---------------------------------------------------------------------------
// Rate-limit handling helpers
// ---------------------------------------------------------------------------

/**
 * Tracks in-flight API calls keyed by an identifier so that concurrent callers
 * can share the same Promise instead of issuing duplicate requests.
 */
const pendingHistoryCalls = new Map<string, Promise<ConversationsHistoryResponse>>();
const pendingRepliesCalls = new Map<string, Promise<ConversationsRepliesResponse>>();

/**
 * Remembers when a channel is allowed to make the next conversations.history call.
 * Keyed by channelId, value is a unix timestamp (ms) after which we may try again.
 */
const channelHistoryRateLimitUntil = new Map<string, number>();

/** Wait until the stored rate-limit for the channel has expired (if any). */
async function waitForChannelHistoryQuota(channelId?: string) {
  if (!channelId) return;
  const waitUntil = channelHistoryRateLimitUntil.get(channelId);
  if (waitUntil && Date.now() < waitUntil) {
    const sleepMs = waitUntil - Date.now();
    if (sleepMs > 0) await new Promise(res => setTimeout(res, sleepMs));
  }
}

function markChannelHistoryRateLimited(channelId: string | undefined, retryAfterMs: number | undefined) {
  if (!channelId) return;
  const until = Date.now() + (retryAfterMs ?? 1000);
  const current = channelHistoryRateLimitUntil.get(channelId) ?? 0;
  // Only extend the window; never shorten it.
  if (until > current) channelHistoryRateLimitUntil.set(channelId, until);
}

export const conversationsHistory = (
  args: ConversationsHistoryArguments
): Promise<ConversationsHistoryResponse> => {
  // Build a simple deterministic key for deduplication.
  const key = `hist:${args.channel}:${args.latest ?? ""}:${args.oldest ?? ""}:${args.ts ?? ""}:${args.limit ?? ""}`;

  if (pendingHistoryCalls.has(key)) {
    return pendingHistoryCalls.get(key)!;
  }

  const promise = (async () => {
    await waitForChannelHistoryQuota(args.channel);

    try {
      const res = await executeWithTokenCycling(
        client => client.conversations.history(args),
        args.channel
      );
      return res;
    } catch (err) {
      const rateInfo = isRateLimited(err);
      if (rateInfo) {
        markChannelHistoryRateLimited(args.channel, rateInfo.retryAfter);
      }
      throw err;
    } finally {
      pendingHistoryCalls.delete(key);
    }
  })();

  pendingHistoryCalls.set(key, promise);
  return promise;
};

export const conversationsReplies = (
  args: ConversationsRepliesArguments
): Promise<ConversationsRepliesResponse> => {
  const key = `repl:${args.channel}:${args.ts ?? ""}`;

  if (pendingRepliesCalls.has(key)) {
    return pendingRepliesCalls.get(key)!;
  }

  const promise = (async () => {
    await waitForChannelHistoryQuota(args.channel);

    try {
      const res = await executeWithTokenCycling(
        client => client.conversations.replies(args),
        args.channel
      );
      return res;
    } catch (err) {
      const rateInfo = isRateLimited(err);
      if (rateInfo) {
        markChannelHistoryRateLimited(args.channel, rateInfo.retryAfter);
      }
      throw err;
    } finally {
      pendingRepliesCalls.delete(key);
    }
  })();

  pendingRepliesCalls.set(key, promise);
  return promise;
}; 