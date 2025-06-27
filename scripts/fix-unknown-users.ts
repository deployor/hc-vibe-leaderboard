import { config } from "dotenv";
import { WebClient } from "@slack/web-api";
import { db } from "../src/db/index.js";
import { messages, users, userStats } from "../src/db/schema.js";
import { eq, or, isNull } from "drizzle-orm";

// Load environment variables
config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function fixUnknownUsers() {
  console.log("Finding messages with unknown users...");
  
  // Find all messages with unknown or null user names
  const unknownMessages = await db.query.messages.findMany({
    where: or(
      eq(messages.userName, "Unknown User"),
      eq(messages.userName, "Unknown"),
      eq(messages.userName, ""),
      isNull(messages.userName)
    ),
    columns: {
      id: true,
      messageTs: true,
      channelId: true,
      userId: true,
      userName: true,
      isPlaceholder: true,
    }
  });

  console.log(`Found ${unknownMessages.length} messages with unknown users`);

  let fixed = 0;
  let failed = 0;

  for (const msg of unknownMessages) {
    try {
      // Skip if userId is also unknown
      if (!msg.userId || msg.userId === "unknown") {
        console.log(`Skipping message ${msg.messageTs} - no valid user ID`);
        continue;
      }

      console.log(`Fixing user info for message ${msg.messageTs} (user: ${msg.userId})`);
      
      // Get user info from Slack
      const userInfo = await slack.users.info({ user: msg.userId });
      
      if (userInfo.ok && userInfo.user) {
        const { user } = userInfo;
        const userName = user.profile?.display_name || user.name || "Unknown";
        const avatarUrl = user.profile?.image_72;
        const userId = user.id!;
        const teamId = user.team_id;

        // Update the message record
        await db
          .update(messages)
          .set({
            userName,
            avatarUrl,
            isPlaceholder: false,
            updatedAt: new Date(),
          })
          .where(eq(messages.id, msg.id));

        // Upsert into users table
        await db.insert(users).values({
          id: userId,
          teamId: teamId,
          name: userName,
          avatarUrl: avatarUrl,
        }).onConflictDoUpdate({
          target: users.id,
          set: {
            name: userName,
            avatarUrl: avatarUrl,
            updatedAt: new Date()
          }
        });

        // Upsert into user_stats table
        await db.insert(userStats).values({
          userId: userId,
          userName: userName,
          avatarUrl: avatarUrl,
        }).onConflictDoUpdate({
          target: userStats.userId,
          set: {
            userName: userName,
            avatarUrl: avatarUrl,
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Fixed and updated all tables for: ${msg.messageTs} -> ${userName}`);
        fixed++;
      } else {
        console.log(`❌ Failed to get user info for ${msg.userId}`);
        failed++;
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error fixing message ${msg.messageTs}:`, error);
      failed++;
    }
  }

  console.log(`\n🎉 Completed! Fixed: ${fixed}, Failed: ${failed}`);
}

// Run the script
fixUnknownUsers().catch(console.error);
