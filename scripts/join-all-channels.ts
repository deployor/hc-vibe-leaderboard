import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

interface SlackError extends Error {
  code: string;
  data?: {
    error?: string;
    [key: string]: unknown;
  };
}

// Load environment variables from .env file
dotenv.config();

const slackToken = process.env.SLACK_TOKEN_CONVHISTORY2;
if (!slackToken) {
  throw new Error("SLACK_TOKEN_CONVHISTORY2 must be defined in your environment.");
}

const slack = new WebClient(slackToken);

const sixtySeconds = 60 * 1000;

// Pause for the specified number of milliseconds.
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function joinAllPublicChannels() {
  console.log("Starting script to join ALL public channels using SLACK_TOKEN_CONVHISTORY2 (if set)...");
  let channelsJoinedInCurrentBatch = 0;
  let totalChannelsJoined = 0;
  const BATCH_LIMIT = 45; // Slack Tier 3 guideline ~50 joins/minute. Stay under.

  try {
    // Automatically paginate over all public channels
    for await (const page of slack.paginate("conversations.list", {
      types: "public_channel",
      exclude_archived: true,
      limit: 200, // Fetch 200 channels per API call
    })) {
      // Ensure page has the channels property
      if (!("channels" in page) || !Array.isArray(page.channels)) {
        console.log("No channels array found in this page, or it is not an array. Skipping.");
        continue;
      }

      const channels = page.channels;
      console.log(`Processing page with ${channels.length} channels...`);

      for (const channel of channels) {
        if (!channel.id || channel.is_member) {
          continue; // Already a member or invalid ID
        }

        // Respect Rate Limits
        if (channelsJoinedInCurrentBatch >= BATCH_LIMIT) {
          console.log(
            `\n--- Rate-limit buffer reached. Joined ${channelsJoinedInCurrentBatch} channels this minute. Total joined so far: ${totalChannelsJoined}. Pausing for 60 seconds... ---\n`
          );
          await sleep(sixtySeconds);
          channelsJoinedInCurrentBatch = 0; // Reset counter for the new minute
        }

        try {
          await slack.conversations.join({ channel: channel.id });
          console.log(`Joined #${channel.name} (${channel.id})`);
          channelsJoinedInCurrentBatch++;
          totalChannelsJoined++;
        } catch (error) {
          const slackError = error as SlackError;
          // Ignore already_in_channel errors
          if (
            slackError.code === "slack_error_code" &&
            slackError.data?.error === "already_in_channel"
          ) {
            // No change in counters
          } else {
            console.error(
              `Failed to join #${channel.name} (${channel.id}):`,
              slackError.data?.error || slackError.message
            );
          }
        }
      }
    }

    console.log(`\nScript finished. Total channels joined: ${totalChannelsJoined}.`);
  } catch (error) {
    console.error("An unexpected error occurred while fetching channel list:", error);
  }
}

joinAllPublicChannels(); 