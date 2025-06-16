import { WebClient } from "@slack/web-api";
import { NextResponse, NextRequest } from "next/server";
import QuickLRU from 'quick-lru';

const slack = new WebClient(process.env.SLACK_MRKDWN_BOT_TOKEN || process.env.SLACK_BOT_TOKEN);

interface UserInfo {
  id: string;
  name: string;
  real_name: string;
  profile: {
    display_name: string;
  };
}

// 500 users cached for 1 hour
const userCache = new QuickLRU<string, UserInfo>({ maxSize: 500, maxAge: 1000 * 60 * 60 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  if (userCache.has(userId)) {
    return NextResponse.json(userCache.get(userId));
  }

  try {
    const response = await slack.users.info({ user: userId });
    if (response.ok && response.user) {
      const userInfo = response.user as UserInfo;
      userCache.set(userId, userInfo);
      return NextResponse.json(userInfo);
    }
    throw new Error(`Failed to fetch user ${userId}`);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
} 