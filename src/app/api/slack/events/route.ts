import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { messages, optedOutUsers, userStats } from "@/db/schema";
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

          const messageText = `Hey <@${channel.creator}>! I'm here to keep track of upvote using :upvote: and :downvote: on messages. I'll be tallying them up on the leaderboard. You can check it out at https://vibe.deployor.dev.`;

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
      const { reaction, item, user: reactingUserId } = event;

      const upvoteReactions = ["upvote", "this"];
      const downvoteReactions = ["downvote"];
      const yayReactions = ["yay"];
      const sobReactions = ["sob", "heavysob"];
      const heartReactions = ["sparkling_heart"];
      const starReactions = ["star"];
      const fireReactions = ["fire"];

      const allTrackedReactions = [
        ...upvoteReactions,
        ...downvoteReactions,
        ...yayReactions,
        ...sobReactions,
        ...heartReactions,
        ...starReactions,
        ...fireReactions,
      ];

      if (!allTrackedReactions.includes(reaction)) {
        return NextResponse.json({ ok: true });
      }

      // --- Update stats for the user who GAVE the reaction ---
      if (reactingUserId) {
        const isAdd = event.type === "reaction_added";
        const change = isAdd ? 1 : -1;
        
        let givenUpvoteChange = 0;
        let givenDownvoteChange = 0;
        let givenYayChange = 0;
        let givenSobChange = 0;
        let givenHeartChange = 0;
        let givenStarChange = 0;
        let givenFireChange = 0;

        if (upvoteReactions.includes(reaction)) givenUpvoteChange = change;
        else if (downvoteReactions.includes(reaction)) givenDownvoteChange = change;
        else if (yayReactions.includes(reaction)) givenYayChange = change;
        else if (sobReactions.includes(reaction)) givenSobChange = change;
        else if (heartReactions.includes(reaction)) givenHeartChange = change;
        else if (starReactions.includes(reaction)) givenStarChange = change;
        else if (fireReactions.includes(reaction)) givenFireChange = change;

        if (
          givenUpvoteChange ||
          givenDownvoteChange ||
          givenYayChange ||
          givenSobChange ||
          givenHeartChange ||
          givenStarChange ||
          givenFireChange
        ) {
            const reactingUserStats = await db.query.userStats.findFirst({
                where: eq(userStats.userId, reactingUserId),
            });

            if (reactingUserStats) {
                await db.update(userStats)
                    .set({
                        givenUpvotes: sql`${userStats.givenUpvotes} + ${givenUpvoteChange}`,
                        givenDownvotes: sql`${userStats.givenDownvotes} + ${givenDownvoteChange}`,
                        givenYay: sql`${userStats.givenYay} + ${givenYayChange}`,
                        givenSob: sql`${userStats.givenSob} + ${givenSobChange}`,
                        givenHeart: sql`${userStats.givenHeart} + ${givenHeartChange}`,
                        givenStar: sql`${userStats.givenStar} + ${givenStarChange}`,
                        givenFire: sql`${userStats.givenFire} + ${givenFireChange}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(userStats.userId, reactingUserId));
            } else {
                const userInfo = await slack.users.info({ user: reactingUserId });
                if (userInfo.ok && userInfo.user) {
                    await db.insert(userStats).values({
                        userId: reactingUserId,
                        userName: userInfo.user.profile?.display_name || userInfo.user.name || "Unknown",
                        avatarUrl: userInfo.user.profile?.image_72,
                        givenUpvotes: givenUpvoteChange > 0 ? 1 : 0,
                        givenDownvotes: givenDownvoteChange > 0 ? 1 : 0,
                        givenYay: givenYayChange > 0 ? 1 : 0,
                        givenSob: givenSobChange > 0 ? 1 : 0,
                        givenHeart: givenHeartChange > 0 ? 1 : 0,
                        givenStar: givenStarChange > 0 ? 1 : 0,
                        givenFire: givenFireChange > 0 ? 1 : 0,
                        updatedAt: new Date(),
                    });
                }
            }
        }
      }

      const { channel, ts } = item;
      // Check if this is a threaded message
      const threadTs = item.thread_ts;
      const isThreadReply = threadTs && threadTs !== ts;

      const message = await db.query.messages.findFirst({
        where: eq(messages.messageTs, ts),
      });

      // --- Check if the message author has opted out ---
      const messageAuthorId = message?.userId;
      if (messageAuthorId) {
        const isOptedOut = await db.query.optedOutUsers.findFirst({
          where: eq(optedOutUsers.slackUserId, messageAuthorId),
        });
        if (isOptedOut) {
          console.log(`Ignoring reaction for message by opted-out user ${messageAuthorId}`);
          return NextResponse.json({ ok: true });
        }
      }
      
      // If message doesn't exist yet, we need to fetch its author to check opt-out status
      if (!message) {
        try {
          let messageData;
          let parentContent = null;
          let parentUserName = null;

          if (isThreadReply) {
            // For threaded messages, we need to fetch from the thread
            const threadHistory = await slack.conversations.replies({ 
              channel, 
              ts: threadTs!,
              inclusive: true 
            });
            messageData = threadHistory.messages?.find(msg => msg.ts === ts);
            
            // Also fetch the parent message for context (it should be the first message in the thread)
            const parentMessage = threadHistory.messages?.[0];
            if (parentMessage && parentMessage.ts === threadTs) {
              parentContent = parentMessage.text || "";
              const parentUserInfo = await slack.users.info({ user: parentMessage.user! });
              parentUserName = parentUserInfo.user?.profile?.display_name || parentUserInfo.user?.name || "Unknown";
                        }
            
            console.log(`Thread reply processing: ts=${ts}, threadTs=${threadTs}, replyContent="${messageData?.text?.substring(0, 50)}...", parentContent="${parentContent?.substring(0, 50)}..."`);
          } else {
            // For regular messages, use conversations.history
            const history = await slack.conversations.history({ channel, latest: ts, limit: 1, inclusive: true });
            messageData = history.messages?.[0];
          }

          if (!messageData || !messageData.user || !messageData.text) {
            return NextResponse.json({ error: "Message details not found in Slack history" }, { status: 404 });
          }

          // --- Check opt-out status BEFORE creating the record ---
          const isOptedOut = await db.query.optedOutUsers.findFirst({
            where: eq(optedOutUsers.slackUserId, messageData.user),
          });
          if (isOptedOut) {
            console.log(`Ignoring new message from opted-out user ${messageData.user}`);
            return NextResponse.json({ ok: true });
          }

          const [userInfo, channelInfo] = await Promise.all([
            slack.users.info({ user: messageData.user }),
            slack.conversations.info({ channel }),
          ]);

          const userName = userInfo.user?.profile?.display_name || userInfo.user?.name || "Unknown";
          const avatarUrl = userInfo.user?.profile?.image_72;
          const channelName = channelInfo.channel?.name || "unknown-channel";

          // --- Get authoritative reaction counts ---
          const reactionData = await slack.reactions.get({ channel, timestamp: ts });
          const upvoterIds = new Set<string>();
          let authoritativeDownvotes = 0;

          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (reactionItem.name && upvoteReactions.includes(reactionItem.name) && reactionItem.users) {
                reactionItem.users.forEach(u => upvoterIds.add(u));
              }
              if (reactionItem.name && downvoteReactions.includes(reactionItem.name)) {
                authoritativeDownvotes = reactionItem.count ?? 0;
              }
            }
          }

          await db.insert(messages).values({
            messageTs: ts,
            channelId: channel,
            channelName: channelName,
            userId: messageData.user,
            userName: userName,
            avatarUrl: avatarUrl,
            content: messageData.text,
            upvotes: upvoterIds.size,
            downvotes: authoritativeDownvotes,
            threadTs: threadTs || null,
            isThreadReply: isThreadReply || false,
            parentContent: parentContent,
            parentUserName: parentUserName,
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
        // --- Re-sync reaction counts for every event on an existing message ---
        console.log(`Re-syncing reactions for existing message ${ts}`);
        try {
          const reactionData = await slack.reactions.get({ channel, timestamp: ts });
          const upvoterIds = new Set<string>();
          let authoritativeDownvotes = 0;

          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (reactionItem.name && upvoteReactions.includes(reactionItem.name) && reactionItem.users) {
                reactionItem.users.forEach(u => upvoterIds.add(u));
              }
              if (reactionItem.name && downvoteReactions.includes(reactionItem.name)) {
                authoritativeDownvotes = reactionItem.count ?? 0;
              }
            }
          }

          await db.update(messages)
            .set({
              upvotes: upvoterIds.size,
              downvotes: authoritativeDownvotes,
              updatedAt: new Date(),
            })
            .where(eq(messages.messageTs, ts));
        } catch (error) {
            console.error(`Error re-syncing reactions for message ${ts}:`, error);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
} 