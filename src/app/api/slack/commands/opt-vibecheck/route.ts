import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { optedOutUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySlackRequest } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-slack-signature")!;
  const timestamp = Number(req.headers.get("x-slack-request-timestamp")!);

  if (!verifySlackRequest(signature, timestamp, body, process.env.SLACK_SIGNING_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = new URLSearchParams(body);
  const userId = data.get("user_id");

  if (!userId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Could not identify user.",
    });
  }

  try {
    const existingUser = await db.query.optedOutUsers.findFirst({
      where: eq(optedOutUsers.slackUserId, userId),
    });

    if (existingUser) {
      await db.delete(optedOutUsers).where(eq(optedOutUsers.slackUserId, userId));
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Welcome back! You have opted back in to Vibe Check. Your messages will now be tracked on the leaderboard.",
      });
    } else {
      await db.insert(optedOutUsers).values({ slackUserId: userId });
      return NextResponse.json({
        response_type: "ephemeral",
        text: "You have successfully opted out of Vibe Check. Your messages will no longer appear on the leaderboard.",
      });
    }
  } catch (error) {
    console.error("Error handling user opt-out:", error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "An unexpected error occurred. Please try again later.",
    });
  }
} 