import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { priorityChannels as priorityChannelsTable } from "@/db/schema";
import type { 
  ConversationsHistoryResponse, 
  ConversationsHistoryArguments,
  ConversationsRepliesResponse,
  ConversationsRepliesArguments,
} from "@slack/web-api";

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
        return await apiCall(priorityClient);
      } catch (error: unknown) {
        const rateInfo = isRateLimited(error);
        if (rateInfo) {
          const waitMs = rateInfo.retryAfter ?? 1000;
          console.warn(
            `Rate limited on priority token. Waiting ${waitMs}ms before falling back to pooled tokens.`
          );
          await new Promise(res => setTimeout(res, waitMs));
        } else {
          console.error("Priority token failed, falling back to pooled tokens:", error);
        }
      }
    }

    // 2. Cycle through pooled tokens
    for (let i = 0; i < clients.length; i++) {
      const client = clients[currentClientIndex];
      const clientIndexForLogging = currentClientIndex;
      currentClientIndex = (currentClientIndex + 1) % clients.length;

      try {
        return await apiCall(client);
      } catch (error: unknown) {
        const rateInfo = isRateLimited(error);

        if (rateInfo) {
          const waitMs = rateInfo.retryAfter ?? 1000;
          console.warn(
            `Rate limited on token index ${clientIndexForLogging}. Retrying with next token after ${waitMs}ms.`
          );
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          const err = error as { data?: { error?: string } };
          if (err?.data?.error) {
            console.error(
              `Slack API error on token index ${clientIndexForLogging}: ${err.data.error}. Trying next token.`
            );
          } else {
            console.error(
              `Unexpected error on token index ${clientIndexForLogging}:`,
              error
            );
          }
        }
      }
    }

    if (attempt < maxRetries) {
      console.log(
        `All tokens failed for attempt ${attempt}/${maxRetries}. Waiting ${retryDelay / 1000}s before retrying.`
      );
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`All Slack API call attempts failed after ${maxRetries} rounds.`);
}

export const conversationsHistory = (
  args: ConversationsHistoryArguments
): Promise<ConversationsHistoryResponse> => {
  return executeWithTokenCycling(client => client.conversations.history(args), args.channel);
};

export const conversationsReplies = (
  args: ConversationsRepliesArguments
): Promise<ConversationsRepliesResponse> => {
  return executeWithTokenCycling(client => client.conversations.replies(args), args.channel);
}; 