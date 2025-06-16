import { WebClient } from "@slack/web-api";
import { NextResponse } from "next/server";
import QuickLRU from "quick-lru";

const slack = new WebClient(process.env.SLACK_MRKDWN_BOT_TOKEN || process.env.SLACK_BOT_TOKEN);

// Cache holds a single entry (the full emoji map) for 1 hour
const emojiLRU = new QuickLRU<string, Record<string, string>>({ maxSize: 1, maxAge: 1000 * 60 * 60 });

export async function GET() {
  if (emojiLRU.has("list")) {
    return NextResponse.json(emojiLRU.get("list"));
  }

  try {
    const response = await slack.emoji.list();
    if (response.ok && response.emoji) {
      const data = response.emoji as Record<string, string>;
      emojiLRU.set("list", data);
      return NextResponse.json(data);
    }
    throw new Error("Failed to fetch emojis from Slack");
  } catch (error) {
    console.error("Error fetching emojis:", error);
    return NextResponse.json({ error: "Failed to fetch emojis" }, { status: 500 });
  }
} 