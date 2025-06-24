import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, gt, and, sql, ne, AnyColumn, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const sort = searchParams.get("sort") ?? "net_score";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const hasEngagement = and(
    gt(messages.totalReactions, 0),
    ne(messages.channelId, "C0710J7F4U9"), // #vibe-check channel
    ne(messages.userId, "U023L3A4UKX"), // beans user
    eq(messages.isPlaceholder, false) // Exclude placeholder records
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
  } else {
    where = hasEngagement;
  }

  const reactionSortColumns = [
    "upvotes", "downvotes", "yay", "sob", "heart", "star", "fire", "leek",
    "real", "same", "skull", "eyes", "yipee", "pingGood", "pingBad",
    "totalReactions",
  ];

  let orderBy;
  if (sort === "net_score") {
    orderBy = desc(sql`${messages.upvotes} - ${messages.downvotes}`);
  } else if (sort === "createdAt") {
    orderBy = desc(messages.createdAt);
  } else if (reactionSortColumns.includes(sort)) {
    const column = messages[sort as keyof typeof messages] as AnyColumn;
    orderBy = desc(column);
  } else {
    // Default fallback
    orderBy = desc(sql`${messages.upvotes} - ${messages.downvotes}`);
  }

  const result = await db
    .select()
    .from(messages)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(result);
} 