import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySlackRequest } from "@/lib/slack";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-slack-signature")!;
  const timestamp = Number(req.headers.get("x-slack-request-timestamp")!);

  if (
    !verifySlackRequest(
      signature,
      timestamp,
      body,
      process.env.SLACK_SIGNING_SECRET!
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const data = JSON.parse(body);

  if (data.type === "url_verification") {
    return NextResponse.json({ challenge: data.challenge });
  }

  if (data.type === "event_callback") {
    const event = data.event;

    // --- Handle new channel creation ---
    if (event.type === "channel_created") {
      const { channel } = event;
      console.log(`New channel created: ${channel.name} (${channel.id}) by ${channel.creator}`);

      // We don't want to block the main thread.
      // We'll process the join and message posting in the background.
      (async () => {
        // Wait 5 seconds to give the channel time to settle.
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          console.log(`Attempting to join channel ${channel.id}`);
          await slack.conversations.join({ channel: channel.id });
          console.log(`Successfully joined channel ${channel.id}`);

          const messageText = `Hey <@${channel.creator}>! I'm here to keep track of vibes! Hack Club community has a fun tradition of using :upvote: and :downvote: on messages. I'll be tallying them up on the leaderboard. You can check it out and find more info at https://vibe.deployor.dev.`;

          await slack.chat.postEphemeral({
            channel: channel.id,
            user: channel.creator,
            text: messageText,
          });
          console.log(`Posted ephemeral welcome message to ${channel.creator} in ${channel.id}`);

        } catch (error) {
          console.error(`Failed to join or post in new channel ${channel.id}:`, error);
        }
      })();
    }

    if (event.type === "reaction_added" || event.type === "reaction_removed") {
      const { reaction, item } = event;

      const upvoteReactions = ["upvote"];
      const downvoteReactions = ["downvote"];

      if (
        !upvoteReactions.includes(reaction) &&
        !downvoteReactions.includes(reaction)
      ) {
        return NextResponse.json({ ok: true });
      }

      const { channel, ts } = item;

      const message = await db.query.messages.findFirst({
        where: eq(messages.messageTs, ts),
      });

      if (!message) {
        try {
          const history = await slack.conversations.history({ channel, latest: ts, limit: 1, inclusive: true });
          const messageData = history.messages?.[0];
          if (!messageData || !messageData.user || !messageData.text) {
            return NextResponse.json({ error: "Message details not found in Slack history" }, { status: 404 });
          }

          const userInfo = await slack.users.info({ user: messageData.user });
          const userName = userInfo.user?.profile?.display_name || userInfo.user?.name || "Unknown";
          const avatarUrl = userInfo.user?.profile?.image_72;

          const reactionData = await slack.reactions.get({ channel, timestamp: ts });
          let initialUpvotes = 0;
          let initialDownvotes = 0;

          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (upvoteReactions.includes(reactionItem.name!)) initialUpvotes = reactionItem.count ?? 0;
              if (downvoteReactions.includes(reactionItem.name!)) initialDownvotes = reactionItem.count ?? 0;
            }
          }

          await db.insert(messages).values({
            messageTs: ts,
            channelId: channel,
            userId: messageData.user,
            userName: userName,
            avatarUrl: avatarUrl,
            content: messageData.text,
            upvotes: initialUpvotes,
            downvotes: initialDownvotes,
            updatedAt: new Date(),
          });

        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            console.log("Race condition handled: Message was created by a concurrent process.");
          } else {
            console.error("An unhandled error occurred during message creation:", error);
          }
        }
      } else {
        const isUpvote = upvoteReactions.includes(reaction);
        const isAdd = event.type === "reaction_added";
        
        const upvoteChange = isUpvote && isAdd ? 1 : (isUpvote && !isAdd ? -1 : 0);
        const downvoteChange = !isUpvote && isAdd ? 1 : (!isUpvote && !isAdd ? -1 : 0);

        const updated = await db.update(messages)
          .set({
            upvotes: sql`${messages.upvotes} + ${upvoteChange}`,
            downvotes: sql`${messages.downvotes} + ${downvoteChange}`,
            totalReactions: sql`${messages.totalReactions} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(messages.messageTs, ts))
          .returning({ totalReactions: messages.totalReactions });
        
        const totalReactions = updated[0]?.totalReactions ?? 0;

        if (totalReactions > 0 && totalReactions % 10 === 0) {
          console.log(`Performing periodic re-sync for message ${ts} at ${totalReactions} reactions.`);
          
          const reactionData = await slack.reactions.get({ channel, timestamp: ts });
          let authoritativeUpvotes = 0;
          let authoritativeDownvotes = 0;

          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (upvoteReactions.includes(reactionItem.name!)) authoritativeUpvotes = reactionItem.count ?? 0;
              if (downvoteReactions.includes(reactionItem.name!)) authoritativeDownvotes = reactionItem.count ?? 0;
            }
          }

          await db.update(messages)
            .set({
              upvotes: authoritativeUpvotes,
              downvotes: authoritativeDownvotes,
              updatedAt: new Date(),
            })
            .where(eq(messages.messageTs, ts));
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
} 