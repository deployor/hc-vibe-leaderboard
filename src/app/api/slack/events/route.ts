import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { messages, optedOutUsers } from "@/db/schema";
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
      const { reaction, item } = event;

      console.log("Received reaction event for item:", JSON.stringify(item, null, 2));

      const upvoteReactions = ["upvote"];
      const downvoteReactions = ["downvote"];

      if (
        !upvoteReactions.includes(reaction) &&
        !downvoteReactions.includes(reaction)
      ) {
        return NextResponse.json({ ok: true });
      }

      const { channel, ts: messageTs } = item;
      // Check if this is a threaded message
      const threadTs = item.thread_ts;
      const isThreadReply = threadTs && parseFloat(threadTs) !== parseFloat(messageTs);

      const message = await db.query.messages.findFirst({
        where: eq(messages.messageTs, messageTs),
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
          let parentContent = null;
          let parentUserName = null;

          // Use conversations.history to fetch the specific message being reacted to.
          // This is more reliable than conversations.replies for finding a specific message.
          const messageHistory = await slack.conversations.history({
            channel,
            latest: messageTs,
            oldest: messageTs,
            limit: 1,
            inclusive: true,
          });

          const messageData = messageHistory.messages?.[0];

          // If it's a thread reply, also fetch the parent message for context
          if (isThreadReply && threadTs) {
            console.log(`Fetching parent message for thread reply. Parent ts: ${threadTs}`);
            const parentHistory = await slack.conversations.history({
              channel,
              latest: threadTs,
              oldest: threadTs,
              limit: 1,
              inclusive: true,
            });
            const parentMessage = parentHistory.messages?.[0];
            if (parentMessage) {
              parentContent = parentMessage.text || "";
              if (parentMessage.user) {
                try {
                  const parentUserInfo = await slack.users.info({ user: parentMessage.user });
                  parentUserName = parentUserInfo.user?.profile?.display_name || parentUserInfo.user?.name || "Unknown";
                } catch (error) {
                  console.error(`Error fetching parent user info for ${parentMessage.user}:`, error);
                  parentUserName = "Unknown";
                }
              }
            } else {
              console.log(`Could not fetch parent message for ts: ${threadTs}`);
            }
          }

          if (!messageData || !messageData.user || !messageData.text) {
            console.error("Message details not found in Slack history for ts:", messageTs, "Response:", messageHistory);
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

          const reactionData = await slack.reactions.get({ channel, timestamp: messageTs });
          let initialUpvotes = 0;
          let initialDownvotes = 0;

          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (upvoteReactions.includes(reactionItem.name!)) initialUpvotes = reactionItem.count ?? 0;
              if (downvoteReactions.includes(reactionItem.name!)) initialDownvotes = reactionItem.count ?? 0;
            }
          }

          await db.insert(messages).values({
            messageTs: messageTs,
            channelId: channel,
            channelName: channelName,
            userId: messageData.user,
            userName: userName,
            avatarUrl: avatarUrl,
            content: messageData.text,
            upvotes: initialUpvotes,
            downvotes: initialDownvotes,
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
        // Message exists, but check if it's a thread reply without parent content or correct flag
        if (isThreadReply && (!message.parentContent || !message.parentUserName || !message.isThreadReply)) {
          console.log(`Updating existing thread reply ${messageTs} with missing parent content or incorrect thread status`);
          try {
            const parentHistory = await slack.conversations.history({
              channel,
              latest: threadTs!,
              oldest: threadTs!,
              limit: 1,
              inclusive: true,
            });
            
            const parentMessage = parentHistory.messages?.[0];
            if (parentMessage) {
              const parentContent = parentMessage.text || "";
              let parentUserName = "Unknown";
              
              if (parentMessage.user) {
                try {
                  const parentUserInfo = await slack.users.info({ user: parentMessage.user });
                  parentUserName = parentUserInfo.user?.profile?.display_name || parentUserInfo.user?.name || "Unknown";
                } catch (error) {
                  console.error(`Error fetching parent user info for ${parentMessage.user}:`, error);
                }
              }
              
              // Update the message with parent content
              await db.update(messages)
                .set({
                  isThreadReply: true,
                  parentContent: parentContent,
                  parentUserName: parentUserName,
                  updatedAt: new Date(),
                })
                .where(eq(messages.messageTs, messageTs));
                
              console.log(`Updated thread reply ${messageTs} with parent content from ${parentUserName}`);
            }
          } catch (error) {
            console.error(`Error updating parent content for thread reply ${messageTs}:`, error);
          }
        }

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
          .where(eq(messages.messageTs, messageTs))
          .returning({ totalReactions: messages.totalReactions });
        
        const totalReactions = updated[0]?.totalReactions ?? 0;

        if (totalReactions > 0 && totalReactions % 10 === 0) {
          console.log(`Performing periodic re-sync for message ${messageTs} at ${totalReactions} reactions.`);
          
          const reactionData = await slack.reactions.get({ channel, timestamp: messageTs });
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
            .where(eq(messages.messageTs, messageTs));
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
} 