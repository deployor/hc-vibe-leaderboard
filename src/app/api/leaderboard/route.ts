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

  let orderBy;
  if (sort === "downvotes") {
    orderBy = [desc(messages.downvotes), asc(sql`upvotes - downvotes`), desc(messages.createdAt)];
  } else {
    orderBy = [desc(sql`upvotes - downvotes`), desc(messages.upvotes), desc(messages.createdAt)];
  }

  const leaderboard = await db
    .select()
    .from(messages)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(leaderboard);
} 