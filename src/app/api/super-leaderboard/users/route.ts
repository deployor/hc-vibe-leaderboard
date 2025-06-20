import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, userStats } from "@/db/schema";
import { desc, gt, and, sql, or, ne, eq, ilike } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const searchQuery = searchParams.get("search");

  const hasEngagement = and(
    or(gt(messages.upvotes, 0), gt(messages.downvotes, 0)),
    ne(sql`upvotes + downvotes`, 0),
    ne(messages.channelId, "C0710J7F4U9"),
    ne(messages.userId, "U023L3A4UKX")
  );

  let where;
  const now = new Date();
  if (filter === "day") {
    const dayAgo = new Date(new Date().setDate(now.getDate() - 1));
    where = and(hasEngagement, gt(messages.createdAt, dayAgo));
  } else if (filter === "week") {
    const weekAgo = new Date(new Date().setDate(now.getDate() - 7));
    where = and(hasEngagement, gt(messages.createdAt, weekAgo));
  } else if (filter === "month") {
    const monthAgo = new Date(new Date().setMonth(now.getMonth() - 1));
    where = and(hasEngagement, gt(messages.createdAt, monthAgo));
  } else if (filter === "year") {
    const yearAgo = new Date(new Date().setFullYear(now.getFullYear() - 1));
    where = and(hasEngagement, gt(messages.createdAt, yearAgo));
  }

  const aggregatedMessages = db.select({
    userId: messages.userId,
    userName: messages.userName,
    avatarUrl: messages.avatarUrl,
    totalUpvotes: sql<number>`SUM(${messages.upvotes})`.as("totalUpvotes"),
    totalDownvotes: sql<number>`SUM(${messages.downvotes})`.as("totalDownvotes"),
    totalYay: sql<number>`SUM(${messages.yay})`.as("totalYay"),
    totalSob: sql<number>`SUM(${messages.sob})`.as("totalSob"),
    totalHeart: sql<number>`SUM(${messages.heart})`.as("totalHeart"),
    totalStar: sql<number>`SUM(${messages.star})`.as("totalStar"),
    totalFire: sql<number>`SUM(${messages.fire})`.as("totalFire"),
    totalLeek: sql<number>`SUM(${messages.leek})`.as("totalLeek"),
    totalReal: sql<number>`SUM(${messages.real})`.as("totalReal"),
    totalSame: sql<number>`SUM(${messages.same})`.as("totalSame"),
    totalSkull: sql<number>`SUM(${messages.skull})`.as("totalSkull"),
    totalEyes: sql<number>`SUM(${messages.eyes})`.as("totalEyes"),
    totalYipee: sql<number>`SUM(${messages.yipee})`.as("totalYipee"),
    totalPingGood: sql<number>`SUM(${messages.pingGood})`.as("totalPingGood"),
    totalPingBad: sql<number>`SUM(${messages.pingBad})`.as("totalPingBad"),
    netScore: sql<number>`SUM(${messages.upvotes}) - SUM(${messages.downvotes})`.as("netScore"),
    messageCount: sql<number>`COUNT(*)`.as("messageCount"),
    lastMessageAt: sql<string>`MAX(${messages.createdAt})`.as("lastMessageAt"),
  }).from(messages).where(where).groupBy(messages.userId, messages.userName, messages.avatarUrl).as("agg");
  
  const finalQuery = db.select({
    userId: aggregatedMessages.userId,
    userName: aggregatedMessages.userName,
    avatarUrl: aggregatedMessages.avatarUrl,
    totalUpvotes: aggregatedMessages.totalUpvotes,
    totalDownvotes: aggregatedMessages.totalDownvotes,
    totalYay: aggregatedMessages.totalYay,
    totalSob: aggregatedMessages.totalSob,
    totalHeart: aggregatedMessages.totalHeart,
    totalStar: aggregatedMessages.totalStar,
    totalFire: aggregatedMessages.totalFire,
    totalLeek: aggregatedMessages.totalLeek,
    totalReal: aggregatedMessages.totalReal,
    totalSame: aggregatedMessages.totalSame,
    totalSkull: aggregatedMessages.totalSkull,
    totalEyes: aggregatedMessages.totalEyes,
    totalYipee: aggregatedMessages.totalYipee,
    totalPingGood: aggregatedMessages.totalPingGood,
    totalPingBad: aggregatedMessages.totalPingBad,
    netScore: aggregatedMessages.netScore,
    messageCount: aggregatedMessages.messageCount,
    lastMessageAt: aggregatedMessages.lastMessageAt,
    givenUpvotes: sql<number>`coalesce(${userStats.givenUpvotes}, 0)`,
    givenDownvotes: sql<number>`coalesce(${userStats.givenDownvotes}, 0)`,
    givenYay: sql<number>`coalesce(${userStats.givenYay}, 0)`,
    givenSob: sql<number>`coalesce(${userStats.givenSob}, 0)`,
    givenHeart: sql<number>`coalesce(${userStats.givenHeart}, 0)`,
    givenStar: sql<number>`coalesce(${userStats.givenStar}, 0)`,
    givenFire: sql<number>`coalesce(${userStats.givenFire}, 0)`,
    givenLeek: sql<number>`coalesce(${userStats.givenLeek}, 0)`,
    givenReal: sql<number>`coalesce(${userStats.givenReal}, 0)`,
    givenSame: sql<number>`coalesce(${userStats.givenSame}, 0)`,
    givenSkull: sql<number>`coalesce(${userStats.givenSkull}, 0)`,
    givenEyes: sql<number>`coalesce(${userStats.givenEyes}, 0)`,
    givenYipee: sql<number>`coalesce(${userStats.givenYipee}, 0)`,
    givenPingGood: sql<number>`coalesce(${userStats.givenPingGood}, 0)`,
    givenPingBad: sql<number>`coalesce(${userStats.givenPingBad}, 0)`,
  })
  .from(aggregatedMessages)
  .leftJoin(userStats, eq(aggregatedMessages.userId, userStats.userId))
  .orderBy(desc(aggregatedMessages.netScore), desc(aggregatedMessages.totalUpvotes), desc(aggregatedMessages.userId))
  .limit(limit)
  .offset(offset);

  if (searchQuery) {
    finalQuery.where(ilike(aggregatedMessages.userName, `%${searchQuery}%`));
  }

  const userLeaderboard = await finalQuery;

  return NextResponse.json(userLeaderboard);
} 