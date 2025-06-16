import { WebClient } from "@slack/web-api";
import { NextResponse } from "next/server";
import { LRUCache } from 'lru-cache';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface UserInfo {
  id: string;
  name: string;
  real_name: string;
  profile: {
    display_name: string;
  };
}

const userCache = new LRUCache<string, UserInfo>({
  max: 500, // cache up to 500 users
  ttl: 1000 * 60 * 60, // 1 hour
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id;
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