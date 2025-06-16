import { WebClient } from "@slack/web-api";
import { NextResponse } from "next/server";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// In-memory cache for emojis
let emojiCache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
  const now = Date.now();
  if (emojiCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return NextResponse.json(emojiCache);
  }

  try {
    const response = await slack.emoji.list();
    if (response.ok && response.emoji) {
      emojiCache = response.emoji;
      cacheTimestamp = now;
      return NextResponse.json(emojiCache);
    }
    throw new Error("Failed to fetch emojis from Slack");
  } catch (error) {
    console.error("Error fetching emojis:", error);
    return NextResponse.json(
      { error: "Failed to fetch emojis" },
      { status: 500 }
    );
  }
} 