import { WebClient } from "@slack/web-api";
import { db } from "../src/db";
import { messages } from "../src/db/schema";
import { eq, or, isNull } from "drizzle-orm";

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
        const userName = userInfo.user.profile?.display_name || userInfo.user.name || "Unknown";
        const avatarUrl = userInfo.user.profile?.image_72;
        
        // Update the message with correct user info
        await db
          .update(messages)
          .set({
            userName: userName,
            avatarUrl: avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(messages.messageTs, msg.messageTs));
        
        console.log(`✅ Fixed: ${msg.messageTs} -> ${userName}`);
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