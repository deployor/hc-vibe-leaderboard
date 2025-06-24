import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { db } from "@/db";
import { messages, optedOutUsers, userStats, reactionEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySlackRequest } from "@/lib/slack";
import { publishHomeView } from "@/lib/app-home";
import { conversationsHistory, conversationsReplies } from "@/lib/slack-token-cycler";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const convoHistory2Token = process.env.SLACK_TOKEN_CONVHISTORY2;
const slackConvo2 = convoHistory2Token ? new WebClient(convoHistory2Token) : null;

// Define reaction categories
const IMPORTANT_REACTIONS = {
  upvotes: ["upvote", "this"],
  downvotes: ["downvote"],
  yay: ["yay"],
  sob: ["sob", "heavysob", "pf", "noooo", "noo", "noooovanish"],
  heart: ["ohneheart", "ohnelove", "blahaj-heart", "heart", "sparkling_heart"],
  star: ["star"],
  fire: ["fire"],
  leek: ["leeks", "leek"],
  real: ["real"],
  same: ["same"],
  skull: ["skulk", "skull", "skull-ios"],
  eyes: ["earthquakyeyes", "eyes_wtf", "eyes", "Eyes"],
  yipee: ["ultrafastparrot", "yipee"],
  pingGood: ["happy_ping_sock"],
  pingBad: ["mad_ping_sock"],
};

const getAllImportantReactions = () => {
  return Object.values(IMPORTANT_REACTIONS).flat();
};

const getReactionCategory = (reaction: string): string | null => {
  for (const [category, reactions] of Object.entries(IMPORTANT_REACTIONS)) {
    if (reactions.includes(reaction)) {
      return category;
    }
  }
  return null;
};

interface ReactionCounts {
  upvotes: number;
  downvotes: number;
  yay: number;
  sob: number;
  heart: number;
  star: number;
  fire: number;
  leek: number;
  real: number;
  same: number;
  skull: number;
  eyes: number;
  yipee: number;
  pingGood: number;
  pingBad: number;
  otherReactions: Record<string, number>;
  totalReactions: number;
}

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

    if (event.type === "app_home_opened") {
      (async () => {
        await publishHomeView(event.user);
      })();
    }

    if (event.type === "channel_created") {
      const { channel } = event;
      console.log(`New channel created: ${channel.name} (${channel.id}) by ${channel.creator}`);

      (async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          console.log(`Attempting to join channel ${channel.id}`);
          await slack.conversations.join({ channel: channel.id });
          if (slackConvo2) {
            try {
              await slackConvo2.conversations.join({ channel: channel.id });
              console.log(`ConvoHistory2 bot joined channel ${channel.id}`);
            } catch (err) {
              console.error(`ConvoHistory2 bot failed to join ${channel.id}:`, err);
            }
          }
          console.log(`Successfully joined channel ${channel.id}`);

          const messageText = `Hey <@${channel.creator}>! I'm here to keep track of upvotes (:upvote:) and downvotes (:downvote:) on messages, then tally them on the leaderboard (https://vibe.deployor.dev).\n\nYou'll also see another helper bot join right after me – it's only here to read conversation history so I can avoid Slack rate-limit issues. Feel free to ignore it; it won't post anything.`;

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
      await handleReactionEvent(event);
    }
  }

        return NextResponse.json({ ok: true });
      }

async function handleReactionEvent(event: {
  type: "reaction_added" | "reaction_removed";
  reaction: string;
  item: {
    channel: string;
    ts: string;
    thread_ts?: string;
  };
  user: string;
}) {
  const { reaction, item, user: reactingUserId } = event;
  const { channel, ts } = item;
  const threadTs = item.thread_ts;
  const isThreadReply = threadTs && threadTs !== ts;
        const isAdd = event.type === "reaction_added";

  // Log all reaction events for debugging and analytics
  try {
    await db.insert(reactionEvents).values({
      messageTs: ts,
      channelId: channel,
      userId: reactingUserId,
      reactionName: reaction,
      eventType: isAdd ? "added" : "removed",
    });
  } catch (error) {
    console.error("Failed to log reaction event:", error);
  }

  // Check if this message exists in our database
  const existingMessage = await db.query.messages.findFirst({
    where: eq(messages.messageTs, ts),
  });

  const isImportantReaction = getAllImportantReactions().includes(reaction);

  // If message doesn't exist, create placeholder record immediately
  if (!existingMessage) {
    try {
             await createPlaceholderMessage(ts, channel, threadTs, !!isThreadReply);
      console.log(`Created placeholder record for message ${ts}`);
    } catch (error) {
      const isDuplicateKeyError = error && typeof error === 'object' && 'cause' in error && 
                                  typeof error.cause === 'object' && error.cause && 'code' in error.cause && 
                                  error.cause.code === '23505';
      if (!isDuplicateKeyError) {
        console.error("Failed to create placeholder message:", error);
      }
    }
  }

  // If this is an important reaction, ensure we have full message details
  if (isImportantReaction) {
    const messageRecord = await db.query.messages.findFirst({
      where: eq(messages.messageTs, ts),
    });

    // Check if message author has opted out
    if (messageRecord?.userId) {
      const isOptedOut = await db.query.optedOutUsers.findFirst({
        where: eq(optedOutUsers.slackUserId, messageRecord.userId),
      });
      if (isOptedOut) {
        console.log(`Ignoring reaction for message by opted-out user ${messageRecord.userId}`);
        return;
      }
    }

    // If it's a placeholder, fill in the full details
    if (messageRecord?.isPlaceholder) {
      try {
                 await fillPlaceholderMessage(ts, channel, threadTs, !!isThreadReply);
        console.log(`Filled placeholder record for message ${ts}`);
      } catch (error) {
        console.error(`Failed to fill placeholder for message ${ts}:`, error);
      }
    }
  }

  // Update reaction counts by re-syncing from Slack
  await resyncMessageReactions(ts, channel);

  // Update user stats for the reacting user
  if (reactingUserId) {
    await updateUserReactionStats(reactingUserId, reaction, isAdd);
  }
}

async function createPlaceholderMessage(ts: string, channel: string, threadTs?: string, isThreadReply?: boolean) {
  await db.insert(messages).values({
    messageTs: ts,
    channelId: channel,
    channelName: null,
    userId: "unknown",
    userName: "Unknown User",
    avatarUrl: null,
    content: "Loading...",
    threadTs: threadTs || null,
    isThreadReply: isThreadReply || false,
    parentContent: null,
    parentUserName: null,
    isPlaceholder: true,
    upvotes: 0,
    downvotes: 0,
    yay: 0,
    sob: 0,
    heart: 0,
    star: 0,
    fire: 0,
    leek: 0,
    real: 0,
    same: 0,
    skull: 0,
    eyes: 0,
    yipee: 0,
    pingGood: 0,
    pingBad: 0,
    totalReactions: 0,
    otherReactions: {},
  });
}

async function fillPlaceholderMessage(ts: string, channel: string, threadTs?: string, isThreadReply?: boolean) {
          let messageData;
          let parentContent = null;
          let parentUserName = null;

          if (isThreadReply) {
            const threadHistory = await conversationsReplies({ 
              channel, 
              ts: threadTs!,
              inclusive: true 
            });
            messageData = threadHistory.messages?.find(msg => msg.ts === ts);
            
            const parentMessage = threadHistory.messages?.[0];
            if (parentMessage && parentMessage.ts === threadTs) {
              parentContent = parentMessage.text || "";
              const parentUserInfo = await slack.users.info({ user: parentMessage.user! });
              parentUserName = parentUserInfo.user?.profile?.display_name || parentUserInfo.user?.name || "Unknown";
                        }
          } else {
            const history = await conversationsHistory({ channel, latest: ts, limit: 1, inclusive: true });
            messageData = history.messages?.[0];
          }

          if (!messageData || !messageData.user || !messageData.text) {
            console.error(`Failed to get message details for ${ts} in channel ${channel}. It might be a private channel, the message was deleted, or there is Slack API lag. Leaving as placeholder.`);
            return;
          }

  // Check if message author has opted out
          const isOptedOut = await db.query.optedOutUsers.findFirst({
            where: eq(optedOutUsers.slackUserId, messageData.user),
          });
          if (isOptedOut) {
    console.log(`Message author ${messageData.user} has opted out, keeping placeholder`);
    return;
          }

          const [userInfo, channelInfo] = await Promise.all([
            slack.users.info({ user: messageData.user }),
            slack.conversations.info({ channel }),
          ]);

          const userName = userInfo.user?.profile?.display_name || userInfo.user?.name || "Unknown";
          const avatarUrl = userInfo.user?.profile?.image_72;
          const channelName = channelInfo.channel?.name || "unknown-channel";

  await db
    .update(messages)
    .set({
            channelName: channelName,
            userId: messageData.user,
            userName: userName,
            avatarUrl: avatarUrl,
            content: messageData.text,
            parentContent: parentContent,
            parentUserName: parentUserName,
      isPlaceholder: false,
            updatedAt: new Date(),
    })
    .where(eq(messages.messageTs, ts));
}

async function resyncMessageReactions(ts: string, channel: string): Promise<void> {
  console.log(`Re-syncing reactions for message ${ts}`);
  try {
    const reactionData = await slack.reactions.get({ channel, timestamp: ts });
    const counts: ReactionCounts = {
      upvotes: 0,
      downvotes: 0,
      yay: 0,
      sob: 0,
      heart: 0,
      star: 0,
      fire: 0,
      leek: 0,
      real: 0,
      same: 0,
      skull: 0,
      eyes: 0,
      yipee: 0,
      pingGood: 0,
      pingBad: 0,
      otherReactions: {},
      totalReactions: 0,
    };

    if (reactionData.ok && reactionData.message?.reactions) {
      for (const reactionItem of reactionData.message.reactions) {
        if (!reactionItem.name || !reactionItem.count) continue;

        const category = getReactionCategory(reactionItem.name);
        if (category) {
          // Handle special case for upvotes (need to get actual user list)
          if (category === "upvotes") {
            const upvoterIds = new Set<string>();
            if (reactionItem.users) {
              reactionItem.users.forEach(u => upvoterIds.add(u));
            }
            counts.upvotes = upvoterIds.size;
          } else {
            counts[category as keyof Omit<ReactionCounts, 'otherReactions' | 'totalReactions'>] = reactionItem.count;
          }
        } else {
          // Track other reactions in JSON field
          counts.otherReactions[reactionItem.name] = reactionItem.count;
        }
        
        counts.totalReactions += reactionItem.count;
      }
    }

    await db
      .update(messages)
      .set({
        upvotes: counts.upvotes,
        downvotes: counts.downvotes,
        yay: counts.yay,
        sob: counts.sob,
        heart: counts.heart,
        star: counts.star,
        fire: counts.fire,
        leek: counts.leek,
        real: counts.real,
        same: counts.same,
        skull: counts.skull,
        eyes: counts.eyes,
        yipee: counts.yipee,
        pingGood: counts.pingGood,
        pingBad: counts.pingBad,
        otherReactions: counts.otherReactions,
        totalReactions: counts.totalReactions,
        updatedAt: new Date(),
      })
      .where(eq(messages.messageTs, ts));
  } catch (error) {
    console.error(`Error re-syncing reactions for message ${ts}:`, error);
  }
}

async function updateUserReactionStats(reactingUserId: string, reaction: string, isAdd: boolean): Promise<void> {
  const change = isAdd ? 1 : -1;
  const category = getReactionCategory(reaction);

  try {
    const existingUserStats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, reactingUserId),
    });

         if (existingUserStats) {
              if (category) {
         // Update important reaction count
         const fieldName = `given${category.charAt(0).toUpperCase() + category.slice(1)}` as keyof typeof userStats.$inferSelect;
         await db.update(userStats)
           .set({
             [fieldName]: sql`${userStats[fieldName]} + ${change}`,
             updatedAt: new Date(),
           })
           .where(eq(userStats.userId, reactingUserId));
       } else {
         // Update other reactions in JSON field
         const currentOtherReactions = existingUserStats.otherGivenReactions as Record<string, number> || {};
         const newCount = (currentOtherReactions[reaction] || 0) + change;
         
         if (newCount <= 0) {
           delete currentOtherReactions[reaction];
         } else {
           currentOtherReactions[reaction] = newCount;
         }
         
         await db.update(userStats)
           .set({
             otherGivenReactions: currentOtherReactions,
             updatedAt: new Date(),
           })
           .where(eq(userStats.userId, reactingUserId));
       }
    } else {
                    // Create new user stats record
       const userInfo = await slack.users.info({ user: reactingUserId });
       if (userInfo.ok && userInfo.user) {
         const baseStats = {
           userId: reactingUserId,
           userName: userInfo.user.profile?.display_name || userInfo.user.name || "Unknown",
           avatarUrl: userInfo.user.profile?.image_72,
           givenUpvotes: 0,
           givenDownvotes: 0,
           givenYay: 0,
           givenSob: 0,
           givenHeart: 0,
           givenStar: 0,
           givenFire: 0,
           givenLeek: 0,
           givenReal: 0,
           givenSame: 0,
           givenSkull: 0,
           givenEyes: 0,
           givenYipee: 0,
           givenPingGood: 0,
           givenPingBad: 0,
           otherGivenReactions: {} as Record<string, number>,
           updatedAt: new Date(),
         };

         if (category && isAdd) {
           const fieldName = `given${category.charAt(0).toUpperCase() + category.slice(1)}`;
           if (fieldName === 'givenUpvotes') baseStats.givenUpvotes = 1;
           else if (fieldName === 'givenDownvotes') baseStats.givenDownvotes = 1;
           else if (fieldName === 'givenYay') baseStats.givenYay = 1;
           else if (fieldName === 'givenSob') baseStats.givenSob = 1;
           else if (fieldName === 'givenHeart') baseStats.givenHeart = 1;
           else if (fieldName === 'givenStar') baseStats.givenStar = 1;
           else if (fieldName === 'givenFire') baseStats.givenFire = 1;
           else if (fieldName === 'givenLeek') baseStats.givenLeek = 1;
           else if (fieldName === 'givenReal') baseStats.givenReal = 1;
           else if (fieldName === 'givenSame') baseStats.givenSame = 1;
           else if (fieldName === 'givenSkull') baseStats.givenSkull = 1;
           else if (fieldName === 'givenEyes') baseStats.givenEyes = 1;
           else if (fieldName === 'givenYipee') baseStats.givenYipee = 1;
           else if (fieldName === 'givenPingGood') baseStats.givenPingGood = 1;
           else if (fieldName === 'givenPingBad') baseStats.givenPingBad = 1;
         } else if (!category && isAdd) {
           baseStats.otherGivenReactions = { [reaction]: 1 };
         }

         await db.insert(userStats)
           .values(baseStats)
           .onConflictDoNothing();
      }
    }
  } catch (error) {
    console.error(`Failed to update user stats for ${reactingUserId}:`, error);
  }
} 