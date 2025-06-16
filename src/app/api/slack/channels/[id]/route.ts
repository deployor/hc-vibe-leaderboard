import { WebClient } from "@slack/web-api";
import { NextRequest, NextResponse } from "next/server";
import QuickLRU from "quick-lru";

const slack = new WebClient(process.env.SLACK_MRKDWN_BOT_TOKEN || process.env.SLACK_BOT_TOKEN);

interface ChannelInfo {
  id: string;
  name: string;
}

// Cache up to 500 channels for 1 hour
const channelCache = new QuickLRU<string, ChannelInfo>({ maxSize: 500, maxAge: 1000 * 60 * 60 });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
  }

  if (channelCache.has(id)) {
    return NextResponse.json(channelCache.get(id));
  }

  try {
    const res = await slack.conversations.info({ channel: id });
    if (res.ok && res.channel) {
      const info = { id: res.channel.id as string, name: (res.channel.name as string) || "unknown" };
      channelCache.set(id, info);
      return NextResponse.json(info);
    }
    throw new Error("Failed");
  } catch (e) {
    console.error("Channel fetch error", e);
    return NextResponse.json({ error: "Failed to fetch channel" }, { status: 500 });
  }
} 