import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, gt, and, sql, ne, AnyColumn } from "drizzle-orm";
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
    ne(messages.userId, "U023L3A4UKX") // beans user
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

  if (reactionSortColumns.includes(sort)) {
    const sortColumn = messages[sort as keyof typeof messages.$inferSelect] as AnyColumn;
    where = and(where, gt(sortColumn, 0));
  }

  let orderBy;
  const secondarySort = [desc(sql`upvotes - downvotes`), desc(messages.createdAt), desc(messages.id)];

  switch (sort) {
    case "net_score":
      orderBy = [desc(sql`upvotes - downvotes`), desc(messages.upvotes), desc(messages.createdAt), desc(messages.id)];
      break;
    case "upvotes":
      orderBy = [desc(messages.upvotes), ...secondarySort];
      break;
    case "downvotes":
      orderBy = [desc(messages.downvotes), ...secondarySort];
      break;
    case "yay":
      orderBy = [desc(messages.yay), ...secondarySort];
      break;
    case "sob":
      orderBy = [desc(messages.sob), ...secondarySort];
      break;
    case "heart":
      orderBy = [desc(messages.heart), ...secondarySort];
      break;
    case "star":
      orderBy = [desc(messages.star), ...secondarySort];
      break;
    case "fire":
      orderBy = [desc(messages.fire), ...secondarySort];
      break;
    case "leek":
      orderBy = [desc(messages.leek), ...secondarySort];
      break;
    case "real":
      orderBy = [desc(messages.real), ...secondarySort];
      break;
    case "same":
      orderBy = [desc(messages.same), ...secondarySort];
      break;
    case "skull":
      orderBy = [desc(messages.skull), ...secondarySort];
      break;
    case "eyes":
      orderBy = [desc(messages.eyes), ...secondarySort];
      break;
    case "yipee":
      orderBy = [desc(messages.yipee), ...secondarySort];
      break;
    case "pingGood":
      orderBy = [desc(messages.pingGood), ...secondarySort];
      break;
    case "pingBad":
      orderBy = [desc(messages.pingBad), ...secondarySort];
      break;
    case "totalReactions":
      orderBy = [desc(messages.totalReactions), ...secondarySort];
      break;
    case "createdAt":
      orderBy = [desc(messages.createdAt), ...secondarySort];
      break;
    default:
      orderBy = [desc(sql`upvotes - downvotes`), desc(messages.upvotes), desc(messages.createdAt), desc(messages.id)];
      break;
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