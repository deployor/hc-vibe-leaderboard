import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { createSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/slack/oauth`;

  const slack = new WebClient();

  try {
    const oauthResponse = await slack.oauth.v2.access({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    if (!oauthResponse.ok || !oauthResponse.authed_user?.id || !oauthResponse.access_token) {
      console.error("Slack OAuth error:", oauthResponse.error);
      return NextResponse.json(
        { error: "Slack authentication failed" },
        { status: 500 }
      );
    }
    
    const { authed_user, team } = oauthResponse;
    const slackUserId = authed_user.id!;
    const teamId = team?.id;
    const accessToken = oauthResponse.access_token!;

    // We have the user's token, but for consistency and to ensure we have the right scopes,
    // we'll use the main bot token to fetch user info.
    const botSlack = new WebClient(process.env.SLACK_BOT_TOKEN);
    const userInfo = await botSlack.users.info({ user: slackUserId });

    if (userInfo.ok && userInfo.user) {
      const { user } = userInfo;
      const userName = user.profile?.display_name || user.name || "Unknown";
      const avatarUrl = user.profile?.image_72;

      await db.insert(users).values({
        id: slackUserId,
        teamId,
        name: userName,
        avatarUrl,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          name: userName,
          avatarUrl,
          teamId,
          updatedAt: new Date(),
        }
      });
    } else {
      console.error(`Could not fetch info for user ${slackUserId}`, userInfo.error);
    }
    
    await createSession({
      slackUserId: slackUserId,
      teamId: teamId ?? "",
      accessToken: accessToken,
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/leaderboard`);
    
  } catch (error) {
    console.error("An unexpected error occurred during OAuth:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 