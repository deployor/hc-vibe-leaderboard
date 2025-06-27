import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/session";

const validSortColumns = [
  "upvotes", "downvotes", "yay", "sob", "heart", "star", 
  "fire", "leek", "real", "same", "skull", "eyes", "yipee", 
  "pingGood", "pingBad", "totalReactions", "createdAt"
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "upvotes";
  
  if (!validSortColumns.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort parameter" }, { status: 400 });
  }

  const orderBy = desc(messages[sort as keyof typeof messages.$inferSelect]);

  const userMessages = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.userId, userId),
      ne(messages.channelId, "C0710J7F4U9"), // Exclude #vibe-check channel
      eq(messages.isPlaceholder, false), // Exclude placeholder records
      ne(messages.userId, "unknown"), // Filter out unknown users
      ne(messages.userName, "Unknown User"), // Filter out unknown user names
      ne(messages.userName, "Unknown") // Filter out unknown user names
    ))
    .orderBy(orderBy)
    .limit(5);

  return NextResponse.json(userMessages);
} 