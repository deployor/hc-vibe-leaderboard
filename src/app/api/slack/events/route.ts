import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { messages, optedOutUsers, userStats } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySlackRequest } from "@/lib/slack";
import { getAllTrackedEmojis, getEmojiCategory } from "@/lib/emoji-config";

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

      const allTrackedReactions = getAllTrackedEmojis();

      if (!allTrackedReactions.includes(reaction)) {
        return NextResponse.json({ ok: true });
      }

      // --- Update stats for the user who GAVE the reaction ---
      if (reactingUserId) {
        const isAdd = event.type === "reaction_added";
        const change = isAdd ? 1 : -1;
        const category = getEmojiCategory(reaction);
        
        if (category) {
          const reactingUserStats = await db.query.userStats.findFirst({
            where: eq(userStats.userId, reactingUserId),
          });

          // Create update object based on category
          const updateData: any = { updatedAt: new Date() };
          const insertData: any = {
            userId: reactingUserId,
            userName: "Unknown",
            avatarUrl: null,
            updatedAt: new Date(),
            // Initialize all fields to 0
            givenUpvotes: 0,
            givenDownvotes: 0,
            givenYay: 0,
            givenSob: 0,
            givenHeart: 0,
            givenStar: 0,
            givenFire: 0,
            givenHearts: 0,
            givenPingBad: 0,
            givenPingGood: 0,
            givenYipeeParrot: 0,
            givenNooo: 0,
            givenEyes: 0,
            givenSkull: 0,
            givenLeek: 0,
            givenReal: 0,
            givenSame: 0,
          };

          // Map category to database column
          switch (category.id) {
            case "upvotes":
              updateData.givenUpvotes = sql`${userStats.givenUpvotes} + ${change}`;
              insertData.givenUpvotes = change > 0 ? 1 : 0;
              break;
            case "downvotes":
              updateData.givenDownvotes = sql`${userStats.givenDownvotes} + ${change}`;
              insertData.givenDownvotes = change > 0 ? 1 : 0;
              break;
            case "yay":
              updateData.givenYay = sql`${userStats.givenYay} + ${change}`;
              insertData.givenYay = change > 0 ? 1 : 0;
              break;
            case "sob":
              updateData.givenSob = sql`${userStats.givenSob} + ${change}`;
              insertData.givenSob = change > 0 ? 1 : 0;
              break;
            case "hearts":
              updateData.givenHeart = sql`${userStats.givenHeart} + ${change}`;
              updateData.givenHearts = sql`${userStats.givenHearts} + ${change}`;
              insertData.givenHeart = change > 0 ? 1 : 0;
              insertData.givenHearts = change > 0 ? 1 : 0;
              break;
            case "star":
              updateData.givenStar = sql`${userStats.givenStar} + ${change}`;
              insertData.givenStar = change > 0 ? 1 : 0;
              break;
            case "fire":
              updateData.givenFire = sql`${userStats.givenFire} + ${change}`;
              insertData.givenFire = change > 0 ? 1 : 0;
              break;
            case "ping_bad":
              updateData.givenPingBad = sql`${userStats.givenPingBad} + ${change}`;
              insertData.givenPingBad = change > 0 ? 1 : 0;
              break;
            case "ping_good":
              updateData.givenPingGood = sql`${userStats.givenPingGood} + ${change}`;
              insertData.givenPingGood = change > 0 ? 1 : 0;
              break;
            case "yipee_parrot":
              updateData.givenYipeeParrot = sql`${userStats.givenYipeeParrot} + ${change}`;
              insertData.givenYipeeParrot = change > 0 ? 1 : 0;
              break;
            case "nooo":
              updateData.givenNooo = sql`${userStats.givenNooo} + ${change}`;
              insertData.givenNooo = change > 0 ? 1 : 0;
              break;
            case "eyes":
              updateData.givenEyes = sql`${userStats.givenEyes} + ${change}`;
              insertData.givenEyes = change > 0 ? 1 : 0;
              break;
            case "skull":
              updateData.givenSkull = sql`${userStats.givenSkull} + ${change}`;
              insertData.givenSkull = change > 0 ? 1 : 0;
              break;
            case "leek":
              updateData.givenLeek = sql`${userStats.givenLeek} + ${change}`;
              insertData.givenLeek = change > 0 ? 1 : 0;
              break;
            case "real":
              updateData.givenReal = sql`${userStats.givenReal} + ${change}`;
              insertData.givenReal = change > 0 ? 1 : 0;
              break;
            case "same":
              updateData.givenSame = sql`${userStats.givenSame} + ${change}`;
              insertData.givenSame = change > 0 ? 1 : 0;
              break;
          }

          if (reactingUserStats) {
            await db.update(userStats)
              .set(updateData)
              .where(eq(userStats.userId, reactingUserId));
          } else {
            const userInfo = await slack.users.info({ user: reactingUserId });
            if (userInfo.ok && userInfo.user) {
              insertData.userName = userInfo.user.profile?.display_name || userInfo.user.name || "Unknown";
              insertData.avatarUrl = userInfo.user.profile?.image_72;
              await db.insert(userStats).values(insertData);
            }
          }
        }
      }

      const { channel, ts } = item;
      // Check if this is a threaded message
      const threadTs = item.thread_ts;
      const isThreadReply = threadTs && threadTs !== ts;

      const resyncMessageReactions = async (ts: string, channel: string) => {
        console.log(`Re-syncing reactions for existing message ${ts}`);
        try {
          const reactionData = await slack.reactions.get({ channel, timestamp: ts });
          
          // Initialize counts for all categories
          const categoryCounts: Record<string, number> = {};
          const upvoterIds = new Set<string>();
          
          if (reactionData.ok && reactionData.message?.reactions) {
            for (const reactionItem of reactionData.message.reactions) {
              if (reactionItem.name && reactionItem.count) {
                const category = getEmojiCategory(reactionItem.name);
                if (category) {
                  // Special handling for upvotes (count unique users)
                  if (category.id === "upvotes" && reactionItem.users) {
                    reactionItem.users.forEach(u => upvoterIds.add(u));
                  } else {
                    categoryCounts[category.id] = (categoryCounts[category.id] || 0) + reactionItem.count;
                  }
                }
              }
            }
          }

          // Build update object
          const updateData: any = {
            upvotes: upvoterIds.size,
            downvotes: categoryCounts.downvotes || 0,
            hearts: categoryCounts.hearts || 0,
            pingBad: categoryCounts.ping_bad || 0,
            pingGood: categoryCounts.ping_good || 0,
            yipeeParrot: categoryCounts.yipee_parrot || 0,
            nooo: categoryCounts.nooo || 0,
            eyes: categoryCounts.eyes || 0,
            skull: categoryCounts.skull || 0,
            leek: categoryCounts.leek || 0,
            real: categoryCounts.real || 0,
            same: categoryCounts.same || 0,
            updatedAt: new Date(),
          };

          await db.update(messages)
            .set(updateData)
            .where(eq(messages.messageTs, ts));
        } catch (error) {
            console.error(`Error re-syncing reactions for message ${ts}:`, error);
        }
      }

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
            
            // console.log(`Thread reply processing: ts=${ts}, threadTs=${threadTs}, replyContent="${messageData?.text?.substring(0, 50)}...", parentContent="${parentContent?.substring(0, 50)}..."`);
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

          await db.insert(messages).values({
            messageTs: ts,
            channelId: channel,
            channelName: channelName,
            userId: messageData.user,
            userName: userName,
            avatarUrl: avatarUrl,
            content: messageData.text,
            upvotes: 0, // Start with 0, will be synced immediately after
            downvotes: 0, // Start with 0, will be synced immediately after
            threadTs: threadTs || null,
            isThreadReply: isThreadReply || false,
            parentContent: parentContent,
            parentUserName: parentUserName,
            updatedAt: new Date(),
          });

          // After successful insert, perform the first sync.
          await resyncMessageReactions(ts, channel);

        } catch (error) {
          const isDuplicateKeyError = error && typeof error === 'object' && 'cause' in error && 
                                      typeof error.cause === 'object' && error.cause && 'code' in error.cause && 
                                      error.cause.code === '23505';

          if (isDuplicateKeyError) {
            console.log(`Race condition handled for message ${ts}. Re-syncing reactions now.`);
            await resyncMessageReactions(ts, channel);
          } else {
            console.error("An unhandled error occurred during message creation:", error);
          }
        }
      } else {
        // --- Re-sync reaction counts for every event on an existing message ---
        await resyncMessageReactions(ts, channel);
      }
    }
  }

  return NextResponse.json({ ok: true });
} 