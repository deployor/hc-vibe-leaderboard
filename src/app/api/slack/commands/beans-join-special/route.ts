import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { verifySlackRequest } from "@/lib/slack";
import { registerPriorityChannel } from "@/lib/slack-token-cycler";

// The user ID allowed to run this command
const ADMIN_USER_ID = "U078PH0GBEH";

// Slack client for the priority / special bot
const priorityToken = process.env.SLACK_TOKEN_CONVHISTORY_PRIORITY;
const priorityClient = priorityToken ? new WebClient(priorityToken) : null;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-slack-signature")!;
  const timestamp = Number(req.headers.get("x-slack-request-timestamp")!);

  if (!verifySlackRequest(signature, timestamp, body, process.env.SLACK_SIGNING_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = new URLSearchParams(body);
  const userId = data.get("user_id");
  const channelId = data.get("channel_id");

  if (userId !== ADMIN_USER_ID) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Sorry, you are not authorized to run this command.",
    });
  }

  if (!priorityClient) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Priority bot token is not configured (SLACK_TOKEN_CONVHISTORY_PRIORITY).",
    });
  }

  try {
    await priorityClient.conversations.join({ channel: channelId! });
    await registerPriorityChannel(channelId!);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Special bot has joined this channel.",
    });
  } catch (error) {
    console.error(`Error joining channel ${channelId} with priority bot:`, error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Failed to add the special bot to this channel. It might already be a member or lack permissions.",
    });
  }
} 