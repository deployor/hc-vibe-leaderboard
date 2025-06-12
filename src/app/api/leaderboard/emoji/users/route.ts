import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, userStats } from "@/db/schema";
import { desc, gt, and, ne, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { EMOJI_CATEGORIES } from "@/lib/emoji-config";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const category = searchParams.get("category") ?? "hearts";
  const sort = searchParams.get("sort") ?? "received"; // "received" or "given"
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Validate category
  const validCategory = EMOJI_CATEGORIES.find(c => c.id === category);
  if (!validCategory) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Get the database column names for the category
  const getColumnNames = (categoryId: string) => {
    switch (categoryId) {
      case "hearts": 
        return { 
          messageColumn: messages.hearts, 
          givenColumn: sql<number>`coalesce(${userStats.givenHearts}, 0) + coalesce(${userStats.givenHeart}, 0)` 
        };
      case "ping_bad": 
        return { 
          messageColumn: messages.pingBad, 
          givenColumn: sql<number>`coalesce(${userStats.givenPingBad}, 0)` 
        };
      case "ping_good": 
        return { 
          messageColumn: messages.pingGood, 
          givenColumn: sql<number>`coalesce(${userStats.givenPingGood}, 0)` 
        };
      case "yipee_parrot": 
        return { 
          messageColumn: messages.yipeeParrot, 
          givenColumn: sql<number>`coalesce(${userStats.givenYipeeParrot}, 0)` 
        };
      case "nooo": 
        return { 
          messageColumn: messages.nooo, 
          givenColumn: sql<number>`coalesce(${userStats.givenNooo}, 0)` 
        };
      case "eyes": 
        return { 
          messageColumn: messages.eyes, 
          givenColumn: sql<number>`coalesce(${userStats.givenEyes}, 0)` 
        };
      case "skull": 
        return { 
          messageColumn: messages.skull, 
          givenColumn: sql<number>`coalesce(${userStats.givenSkull}, 0)` 
        };
      case "leek": 
        return { 
          messageColumn: messages.leek, 
          givenColumn: sql<number>`coalesce(${userStats.givenLeek}, 0)` 
        };
      case "real": 
        return { 
          messageColumn: messages.real, 
          givenColumn: sql<number>`coalesce(${userStats.givenReal}, 0)` 
        };
      case "same": 
        return { 
          messageColumn: messages.same, 
          givenColumn: sql<number>`coalesce(${userStats.givenSame}, 0)` 
        };
      case "upvotes": 
        return { 
          messageColumn: messages.upvotes, 
          givenColumn: sql<number>`coalesce(${userStats.givenUpvotes}, 0)` 
        };
      case "downvotes": 
        return { 
          messageColumn: messages.downvotes, 
          givenColumn: sql<number>`coalesce(${userStats.givenDownvotes}, 0)` 
        };
      default: 
        return { 
          messageColumn: messages.hearts, 
          givenColumn: sql<number>`coalesce(${userStats.givenHearts}, 0)` 
        };
    }
  };

  const { messageColumn, givenColumn } = getColumnNames(category);

  // Require at least some engagement - either received > 0
  // Exclude polling channel and specific user
  const hasEngagement = and(
    gt(messageColumn, 0),
    ne(messages.channelId, "C0710J7F4U9"),
    ne(messages.userId, "U023L3A4UKX")
  );

  let where;
  const now = new Date();
  if (filter === "day") {
    const dayAgo = new Date(now.setDate(now.getDate() - 1));
    where = and(hasEngagement, gt(messages.createdAt, dayAgo));
  } else if (filter === "month") {
    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
    where = and(hasEngagement, gt(messages.createdAt, monthAgo));
  } else if (filter === "year") {
    const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
    where = and(hasEngagement, gt(messages.createdAt, yearAgo));
  } else {
    where = hasEngagement;
  }

  const aggregatedMessages = db.select({
    userId: messages.userId,
    userName: messages.userName,
    avatarUrl: messages.avatarUrl,
    totalReceived: sql<number>`SUM(${messageColumn})`.as("totalReceived"),
    messageCount: sql<number>`COUNT(*)`.as("messageCount"),
    lastMessageAt: sql<string>`MAX(${messages.createdAt})`.as("lastMessageAt"),
  }).from(messages).where(where).groupBy(messages.userId, messages.userName, messages.avatarUrl).as("agg");

  // Determine sort order
  let orderBy;
  if (sort === "given") {
    orderBy = [desc(givenColumn)];
  } else {
    // Default to sorting by total received
    orderBy = [desc(aggregatedMessages.totalReceived)];
  }

  const userLeaderboard = await db.select({
    userId: aggregatedMessages.userId,
    userName: aggregatedMessages.userName,
    avatarUrl: aggregatedMessages.avatarUrl,
    totalReceived: aggregatedMessages.totalReceived,
    messageCount: aggregatedMessages.messageCount,
    lastMessageAt: aggregatedMessages.lastMessageAt,
    totalGiven: givenColumn.as("totalGiven"),
  })
  .from(aggregatedMessages)
  .leftJoin(userStats, eq(aggregatedMessages.userId, userStats.userId))
  .orderBy(...orderBy)
  .limit(limit)
  .offset(offset);

  return NextResponse.json({
    users: userLeaderboard,
    category: validCategory,
    sort,
  });
} 