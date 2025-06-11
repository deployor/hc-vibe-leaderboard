import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { createSession } from "@/lib/session";

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
    
    await createSession({
      slackUserId: oauthResponse.authed_user.id,
      teamId: oauthResponse.team?.id ?? "",
      accessToken: oauthResponse.access_token,
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