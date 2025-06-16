import { WebClient, View, UsersInfoResponse } from "@slack/web-api";
import { db } from "@/db";
import { optedOutUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KnownBlock, ImageElement } from "@slack/types";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const DEPLOYOR_USER_ID = "U078PH0GBEH";

async function fetchDeployorImage(): Promise<string | null> {
  try {
    const res = (await slack.users.info({ user: DEPLOYOR_USER_ID })) as UsersInfoResponse;
    if (res.ok && res.user && res.user.profile?.image_72) {
      return res.user.profile.image_72 as string;
    }
  } catch (error) {
    console.error("Failed to fetch deployor profile image:", error);
  }
  return null;
}

async function buildHomeView(userId: string): Promise<View> {
  const isOptedOut = await db.query.optedOutUsers.findFirst({
    where: eq(optedOutUsers.slackUserId, userId),
  });

  const optOutStatusText = isOptedOut
    ? "🔴 You are currently *opted out* of VibeCCheck. Your messages will not appear on the leaderboard."
    : "✅ You are currently *opted in* to VibeCheck. Your messages can appear on the leaderboard.";

  const optOutButtonText = isOptedOut ? "Opt Back In" : "Opt Out";
  const optOutButtonStyle = isOptedOut ? "primary" : "danger";

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "VibeCheck HQ",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Welcome to your Vibe Check dashboard! Here you can manage your participation.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Your Status:*\n${optOutStatusText}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: optOutButtonText,
          emoji: true,
        },
        style: optOutButtonStyle,
        action_id: "toggle_opt_out",
        value: userId,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Manage Channel Participation*\nWant Vibe Check to leave or rejoin a specific channel? If you're the channel creator or a workspace admin, you can use the `/opt-vibecheck-channel` command within that channel.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🚀 View Leaderboard",
            emoji: true,
          },
          url: "https://vibe.deployor.dev/leaderboard",
          action_id: "link_to_leaderboard",
        },
      ],
    },
  ];

  const deployorImage = await fetchDeployorImage();
  blocks.push({
    type: "divider",
  } as KnownBlock);
  blocks.push({
    type: "context",
    elements: [
      ...(deployorImage
        ? [
            {
              type: "image",
              image_url: deployorImage,
              alt_text: "deployor avatar",
            } as ImageElement,
          ]
        : []),
      {
        type: "mrkdwn",
        text: "– made by *deployor*",
      },
    ],
  } as KnownBlock);

  return {
    type: "home",
    blocks: blocks,
  } as View;
}

export async function publishHomeView(userId: string) {
  try {
    const view = await buildHomeView(userId);
    await slack.views.publish({
      user_id: userId,
      view: view,
    });
    console.log(`Published App Home for user ${userId}`);
  } catch (error) {
    console.error(`Error publishing App Home for user ${userId}:`, error);
  }
} 