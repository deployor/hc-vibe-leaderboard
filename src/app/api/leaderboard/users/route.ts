import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, userStats } from "@/db/schema";
import { desc, gt, and, sql, or, ne, asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const sort = searchParams.get("sort") ?? "upvotes";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const hasEngagement = and(
    or(gt(messages.upvotes, 0), gt(messages.downvotes, 0)),
    ne(sql`upvotes + downvotes`, 0),
    ne(messages.channelId, "C0710J7F4U9"),
    ne(messages.userId, "U023L3A4UKX")
  );

  let where;
  const now = new Date();
  if (filter === "day") {
    const dayAgo = new Date(now.setDate(now.getDate() - 1));
    where = and(hasEngagement, gt(messages.createdAt, dayAgo));
  } else if (filter === "week") {
    const weekAgo = new Date(new Date().setDate(now.getDate() - 7));
    where = and(hasEngagement, gt(messages.createdAt, weekAgo));
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
      totalUpvotes: sql<number>`SUM(${messages.upvotes})`.as("totalUpvotes"),
      totalDownvotes: sql<number>`SUM(${messages.downvotes})`.as("totalDownvotes"),
      netScore: sql<number>`SUM(${messages.upvotes}) - SUM(${messages.downvotes})`.as("netScore"),
      messageCount: sql<number>`COUNT(*)`.as("messageCount"),
      lastMessageAt: sql<string>`MAX(${messages.createdAt})`.as("lastMessageAt"),
  }).from(messages).where(where).groupBy(messages.userId, messages.userName, messages.avatarUrl).as("agg");

  let orderBy;
  if (sort === "downvotes") {
    orderBy = [desc(aggregatedMessages.totalDownvotes), asc(aggregatedMessages.netScore)];
  } else {
    orderBy = [desc(aggregatedMessages.netScore), desc(aggregatedMessages.totalUpvotes)];
  }

  const userLeaderboard = await db.select({
      userId: aggregatedMessages.userId,
      userName: aggregatedMessages.userName,
      avatarUrl: aggregatedMessages.avatarUrl,
      totalUpvotes: aggregatedMessages.totalUpvotes,
      totalDownvotes: aggregatedMessages.totalDownvotes,
      netScore: aggregatedMessages.netScore,
      messageCount: aggregatedMessages.messageCount,
      lastMessageAt: aggregatedMessages.lastMessageAt,
      givenUpvotes: sql<number>`coalesce(${userStats.givenUpvotes}, 0)`,
      givenDownvotes: sql<number>`coalesce(${userStats.givenDownvotes}, 0)`,
  })
  .from(aggregatedMessages)
  .leftJoin(userStats, eq(aggregatedMessages.userId, userStats.userId))
  .orderBy(...orderBy)
  .limit(limit)
  .offset(offset);

  return NextResponse.json(userLeaderboard);
} 