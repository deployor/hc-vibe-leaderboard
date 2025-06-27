import { config } from "dotenv";
import { db } from "../src/db/index.js";
import { messages } from "../src/db/schema.js";
import { eq, or, and } from "drizzle-orm";

// Load environment variables
config();

async function cleanupUnknownUsers() {
  console.log("Finding and removing unknown user records...");
  
  try {
    // First, count how many records we'll be deleting
    const unknownRecords = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.userId, "unknown"),
          eq(messages.userName, "Unknown User"),
          eq(messages.userName, "Unknown"),
          eq(messages.userName, "")
        )
      );

    console.log(`Found ${unknownRecords.length} unknown user records to delete`);

    // Delete messages with unknown users
    await db
      .delete(messages)
      .where(
        or(
          eq(messages.userId, "unknown"),
          eq(messages.userName, "Unknown User"),
          eq(messages.userName, "Unknown"),
          eq(messages.userName, "")
        )
      );

    console.log(`✅ Deleted ${unknownRecords.length} unknown user records`);
    
    // Count placeholder records with unknown users
    const placeholderRecords = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.isPlaceholder, true),
          eq(messages.userId, "unknown")
        )
      );

    console.log(`Found ${placeholderRecords.length} placeholder records with unknown users to delete`);

    // Also delete placeholder records that might still be lingering
    await db
      .delete(messages)
      .where(
        and(
          eq(messages.isPlaceholder, true),
          eq(messages.userId, "unknown")
        )
      );

    console.log(`✅ Deleted ${placeholderRecords.length} placeholder records with unknown users`);
    
    console.log("🎉 Cleanup completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupUnknownUsers().catch(console.error); 