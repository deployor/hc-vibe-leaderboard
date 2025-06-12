import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    messageTs: text("message_ts").notNull().unique(),
    channelId: text("channel_id").notNull(),
    channelName: text("channel_name"),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    avatarUrl: text("avatar_url"),
    content: text("content").notNull(),
    upvotes: integer("upvotes").default(0).notNull(),
    downvotes: integer("downvotes").default(0).notNull(),
    totalReactions: integer("total_reactions").default(0).notNull(),
    // Thread support fields
    threadTs: text("thread_ts"), // null for regular messages, parent message timestamp for threaded messages
    isThreadReply: boolean("is_thread_reply").default(false).notNull(),
    parentContent: text("parent_content"), // content of the parent message for context
    parentUserName: text("parent_user_name"), // username of parent message author
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (messages) => {
    return {
      messageTsIndex: uniqueIndex("message_ts_idx").on(messages.messageTs),
    };
  }
);

export const optedOutUsers = pgTable("opted_out_users", {
  slackUserId: text("slack_user_id").primaryKey(),
});

export const userStats = pgTable("user_stats", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull(),
  avatarUrl: text("avatar_url"),
  givenUpvotes: integer("given_upvotes").default(0).notNull(),
  givenDownvotes: integer("given_downvotes").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 