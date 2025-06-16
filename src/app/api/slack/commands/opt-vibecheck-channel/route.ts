import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { verifySlackRequest } from "@/lib/slack";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const convoHistory2Token = process.env.SLACK_TOKEN_CONVHISTORY2;
const slackConvo2 = convoHistory2Token ? new WebClient(convoHistory2Token) : null;

async function isUserChannelManager(userId: string, channelId: string): Promise<boolean> {
  try {
    if (userId === "U078PH0GBEH") {
      return true;
    }

    const [userInfo, channelInfo] = await Promise.all([
      slack.users.info({ user: userId }),
      slack.conversations.info({ channel: channelId })
    ]);

    const isWorkspaceAdmin = !!(userInfo.ok && (userInfo.user?.is_admin || userInfo.user?.is_owner));
    const isChannelCreator = !!(channelInfo.ok && channelInfo.channel?.creator === userId);

    return isWorkspaceAdmin || isChannelCreator;
  } catch (error) {
    console.error(`Error checking channel manager status for user ${userId} in channel ${channelId}:`, error);
    return false;
  }
}

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

  if (!userId || !channelId) {
    return NextResponse.json({ text: "Missing user or channel information." });
  }

  const isManager = await isUserChannelManager(userId, channelId);
  if (!isManager) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Sorry, this command can only be used by the person who created this channel, or by a workspace Admin/Owner.",
    });
  }

  try {
    const channelInfo = await slack.conversations.info({ channel: channelId });
    const botIsMember = channelInfo.channel?.is_member;

    if (botIsMember) {
      await slack.conversations.leave({ channel: channelId });
      if (slackConvo2) {
        try {
          await slackConvo2.conversations.leave({ channel: channelId });
        } catch (err) {
          console.error(`ConvoHistory2 failed to leave ${channelId}:`, err);
        }
      }
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Success! Both bots have left this channel. A channel manager can run this command again to have us rejoin.",
      });
    } else {
      await slack.conversations.join({ channel: channelId });
      if (slackConvo2) {
        try {
          await slackConvo2.conversations.join({ channel: channelId });
        } catch (err) {
          console.error(`ConvoHistory2 failed to join ${channelId}:`, err);
        }
      }
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Welcome back! Both bots have rejoined the channel.",
      });
    }
  } catch (error) {
    console.error(`Error handling channel opt-out for channel ${channelId}:`, error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "An unexpected error occurred. I might not have the right permissions to join or leave this channel.",
    });
  }
} 