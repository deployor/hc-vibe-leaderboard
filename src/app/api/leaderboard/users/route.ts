import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, gt, and, sql, or, ne, asc } from "drizzle-orm";
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

  // Require at least some engagement - either upvotes > 0 OR downvotes > 0
  // Also explicitly exclude messages where both are 0
  const hasEngagement = and(
    or(gt(messages.upvotes, 0), gt(messages.downvotes, 0)),
    ne(sql`upvotes + downvotes`, 0)
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

  // Determine sort order for user aggregation
  let orderBy;
  if (sort === "downvotes") {
    // For downvotes, sort by total downvotes descending, then by net score ascending (more negative = more hated)
    orderBy = [desc(sql`SUM(downvotes)`), asc(sql`SUM(upvotes) - SUM(downvotes)`)];
  } else {
    // Default to sorting by net score (total upvotes - total downvotes), then by total upvotes
    orderBy = [desc(sql`SUM(upvotes) - SUM(downvotes)`), desc(sql`SUM(upvotes)`)];
  }

  const userLeaderboard = await db
    .select({
      userId: messages.userId,
      userName: messages.userName,
      avatarUrl: messages.avatarUrl,
      totalUpvotes: sql<number>`SUM(${messages.upvotes})`,
      totalDownvotes: sql<number>`SUM(${messages.downvotes})`,
      netScore: sql<number>`SUM(${messages.upvotes}) - SUM(${messages.downvotes})`,
      messageCount: sql<number>`COUNT(*)`,
      lastMessageAt: sql<string>`MAX(${messages.createdAt})`,
    })
    .from(messages)
    .where(where)
    .groupBy(messages.userId, messages.userName, messages.avatarUrl)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(userLeaderboard);
} 