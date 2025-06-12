import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { optedOutUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySlackRequest } from "@/lib/slack";
import { publishHomeView } from "@/lib/app-home";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-slack-signature")!;
  const timestamp = Number(req.headers.get("x-slack-request-timestamp")!);

  if (!verifySlackRequest(signature, timestamp, body, process.env.SLACK_SIGNING_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = new URLSearchParams(body).get("payload");
  if (!payload) {
    return new Response("Invalid payload", { status: 400 });
  }

  const data = JSON.parse(payload);

  // Handle block actions (e.g., button clicks)
  if (data.type === "block_actions") {
    // We don't want to block the main thread.
    (async () => {
      for (const action of data.actions) {
        const userId = data.user.id;

        if (action.action_id === "opt_out") {
          console.log(`User ${userId} is opting out.`);
          await db.insert(optedOutUsers).values({ slackUserId: userId }).onConflictDoNothing();
        } else if (action.action_id === "opt_in") {
          console.log(`User ${userId} is opting in.`);
          await db.delete(optedOutUsers).where(eq(optedOutUsers.slackUserId, userId));
        }
        
        // After an action, always update the home view to reflect the new state
        await publishHomeView(userId);
      }
    })();
  }

  // Acknowledge the interaction immediately
  return new NextResponse(null, { status: 200 });
} 