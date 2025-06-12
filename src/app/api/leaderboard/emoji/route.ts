import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, gt, and, ne } from "drizzle-orm";
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
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Validate category
  const validCategory = EMOJI_CATEGORIES.find(c => c.id === category);
  if (!validCategory) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Get the database column name for the category
  const getColumnName = (categoryId: string) => {
    switch (categoryId) {
      case "hearts": return messages.hearts;
      case "ping_bad": return messages.pingBad;
      case "ping_good": return messages.pingGood;
      case "yipee_parrot": return messages.yipeeParrot;
      case "nooo": return messages.nooo;
      case "eyes": return messages.eyes;
      case "skull": return messages.skull;
      case "leek": return messages.leek;
      case "real": return messages.real;
      case "same": return messages.same;
      case "upvotes": return messages.upvotes;
      case "downvotes": return messages.downvotes;
      default: return messages.hearts;
    }
  };

  const categoryColumn = getColumnName(category);

  // Require at least 1 reaction of the selected category
  // Exclude polling channel and specific user
  const hasEngagement = and(
    gt(categoryColumn, 0),
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

  // Sort by the selected category count, then by creation date
  const orderBy = [desc(categoryColumn), desc(messages.createdAt)];

  const leaderboard = await db
    .select()
    .from(messages)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    messages: leaderboard,
    category: validCategory,
  });
} 