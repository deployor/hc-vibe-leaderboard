import { WebClient, View } from "@slack/web-api";
import { db } from "@/db";
import { optedOutUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function buildHomeView(userId: string) {
  const isOptedOut = await db.query.optedOutUsers.findFirst({
    where: eq(optedOutUsers.slackUserId, userId),
  });

  const statusText = isOptedOut
    ? ":red_circle: *You are currently opted-out.* Your messages will not appear on the Vibe Check leaderboard."
    : ":large_green_circle: *You are currently opted-in.* Your messages are eligible to appear on the Vibe Check leaderboard.";
  
  const buttonText = isOptedOut ? "Opt-In" : "Opt-Out";
  const actionId = isOptedOut ? "opt_in" : "opt_out";
  const style = isOptedOut ? "primary" : "danger";


  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Welcome to Vibe Check!* :wave:",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "This is your central hub for managing your Vibe Check settings and accessing the leaderboard.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Leaderboard Participation*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: statusText,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: buttonText,
            emoji: true,
          },
          style: style,
          value: userId,
          action_id: actionId,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Channel Management*",
      },
    },
     {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "As a channel creator or workspace admin, you can ask me to leave or rejoin a specific public channel using the `/opt-vibecheck-channel` command from within that channel.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Ready to see the vibes? :zap:",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Go to Leaderboard",
          emoji: true,
        },
        url: "https://vibe.hackclub.com",
        action_id: "link_to_leaderboard",
      },
    },
  ];

  return {
    type: "home",
    blocks: blocks,
  };
}

export async function publishHomeView(userId: string) {
  try {
    const view = await buildHomeView(userId);
    await slack.views.publish({
      user_id: userId,
      view: view as View,
    });
  } catch (error) {
    console.error(`Failed to publish home view for user ${userId}:`, error);
  }
} 