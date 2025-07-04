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

  const data = new URLSearchParams(body);
  const payloadStr = data.get("payload");

  if (!payloadStr) {
    return new Response("Missing payload", { status: 400 });
  }

  const payload = JSON.parse(payloadStr);

  if (payload.type === "block_actions") {
    (async () => {
      const action = payload.actions[0];
      const userId = payload.user.id;

      if (action.action_id === "toggle_opt_out") {
        try {
          const existingUser = await db.query.optedOutUsers.findFirst({
            where: eq(optedOutUsers.slackUserId, userId),
          });

          if (existingUser) {
            await db.delete(optedOutUsers).where(eq(optedOutUsers.slackUserId, userId));
            console.log(`User ${userId} opted back in.`);
          } else {
            await db.insert(optedOutUsers).values({ slackUserId: userId });
            console.log(`User ${userId} opted out.`);
          }

          await publishHomeView(userId);

        } catch (error) {
          console.error(`Error handling user opt-out toggle for ${userId}:`, error);
        }
      }
    })();
  }

  return NextResponse.json({ ok: true });
} 