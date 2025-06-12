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

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const sixtySeconds = 60 * 1000;

// This function will pause execution for a specified number of milliseconds.
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function joinAllPublicChannels() {
  console.log("Starting script to join all public channels starting with 'C09'...");
  let channelsJoinedInCurrentBatch = 0;
  
  try {
    // We use slack.paginate to automatically handle the pagination of channels.
    for await (const page of slack.paginate("conversations.list", {
      types: "public_channel",
      exclude_archived: true,
      limit: 200 // Fetch 200 channels per API call
    })) {
      // Type guard to ensure page has the channels property
      if (!("channels" in page) || !Array.isArray(page.channels)) {
        console.log("No channels array found in this page, or it is not an array. Skipping.");
        continue;
      }
      
      const channels = page.channels;
      
      console.log(`Found a page with ${channels.length} channels. Processing...`);

      for (const channel of channels) {
        if (!channel.id || !channel.id.startsWith("C09") || channel.is_member) {
          if (channel.is_member) {
            // console.log(`Already a member of #${channel.name} (${channel.id}). Skipping.`);
          }
          continue;
        }

        // --- Respect Rate Limits ---
        // Slack's Tier 3 allows for ~50 calls per minute. We'll be conservative.
        if (channelsJoinedInCurrentBatch >= 45) {
          console.log(`\n--- Rate limit buffer reached. Pausing for 60 seconds... ---\n`);
          await sleep(sixtySeconds);
          channelsJoinedInCurrentBatch = 0; // Reset counter for the new minute
        }
        
        try {
          await slack.conversations.join({ channel: channel.id });
          console.log(`Successfully joined #${channel.name} (${channel.id})`);
          channelsJoinedInCurrentBatch++;
        } catch (error) {
          const slackError = error as SlackError;
          if (slackError.code === 'slack_error_code' && slackError.data?.error === 'already_in_channel') {
            // This is expected if the script is re-run. Do nothing.
          } else {
            console.error(`Failed to join #${channel.name} (${channel.id}):`, slackError.data?.error || slackError.message);
          }
        }
      }
    }
    
    console.log("\nScript finished. All accessible public channels starting with 'C09' have been joined.");

  } catch (error) {
    console.error("An unexpected error occurred while fetching channel list:", error);
  }
}

joinAllPublicChannels(); 