import "dotenv/config";
import { db } from "../src/db";
import { messages, userStats, users } from "../src/db/schema";
import { eq, or, sql } from "drizzle-orm";

async function cleanupUnknownUserData() {
  console.log("Starting cleanup of unknown user data...");

  // Update messages table
  console.log("Updating messages table...");
  await db
    .update(messages)
    .set({
      userName: null,
      avatarUrl: null,
      userId: null,
    })
    .where(
      or(
        eq(messages.userName, "Unknown User"),
        eq(messages.userName, "Unknown"),
        eq(messages.userName, ""),
        eq(messages.avatarUrl, ""),
        eq(messages.userId, "unknown")
      )
    );
  console.log("Messages table updated.");

  // Update userStats table
  console.log("Updating userStats table...");
  await db
    .update(userStats)
    .set({
      userName: null,
      avatarUrl: null,
    })
    .where(
      or(
        eq(userStats.userName, "Unknown User"),
        eq(userStats.userName, "Unknown"),
        eq(userStats.userName, ""),
        eq(userStats.avatarUrl, "")
      )
    );
  console.log("userStats table updated.");

  // Update users table
  console.log("Updating users table...");
  await db
    .update(users)
    .set({
      name: null,
      avatarUrl: null,
    })
    .where(
      or(
        eq(users.name, "Unknown User"),
        eq(users.name, "Unknown"),
        eq(users.name, ""),
        eq(users.avatarUrl, "")
      )
    );
  console.log("users table updated.");

  console.log("Cleanup complete!");
  process.exit(0);
}

cleanupUnknownUserData().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
