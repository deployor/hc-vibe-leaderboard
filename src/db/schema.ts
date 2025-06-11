import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    messageTs: text("message_ts").notNull().unique(),
    channelId: text("channel_id").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    avatarUrl: text("avatar_url"),
    content: text("content").notNull(),
    upvotes: integer("upvotes").default(0).notNull(),
    downvotes: integer("downvotes").default(0).notNull(),
    totalReactions: integer("total_reactions").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (messages) => {
    return {
      messageTsIndex: uniqueIndex("message_ts_idx").on(messages.messageTs),
    };
  }
); 