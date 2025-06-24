import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  boolean,
  json,
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
    yay: integer("yay").default(0).notNull(),
    sob: integer("sob").default(0).notNull(),
    heart: integer("heart").default(0).notNull(),
    star: integer("star").default(0).notNull(),
    fire: integer("fire").default(0).notNull(),
    leek: integer("leek").default(0).notNull(),
    real: integer("real").default(0).notNull(),
    same: integer("same").default(0).notNull(),
    skull: integer("skull").default(0).notNull(),
    eyes: integer("eyes").default(0).notNull(),
    yipee: integer("yipee").default(0).notNull(),
    pingGood: integer("ping_good").default(0).notNull(),
    pingBad: integer("ping_bad").default(0).notNull(),
    totalReactions: integer("total_reactions").default(0).notNull(),
    // JSON field for all other reactions not tracked individually
    otherReactions: json("other_reactions").default({}).notNull(),
    // Thread support fields
    threadTs: text("thread_ts"), // null for regular messages, parent message timestamp for threaded messages
    isThreadReply: boolean("is_thread_reply").default(false).notNull(),
    parentContent: text("parent_content"), // content of the parent message for context
    parentUserName: text("parent_user_name"), // username of parent message author
    // Indicates if this is a placeholder record (only has basic info from reaction event)
    isPlaceholder: boolean("is_placeholder").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (messages) => [
    uniqueIndex("message_ts_idx").on(messages.messageTs),
  ]
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
  givenYay: integer("given_yay").default(0).notNull(),
  givenSob: integer("given_sob").default(0).notNull(),
  givenHeart: integer("given_heart").default(0).notNull(),
  givenStar: integer("given_star").default(0).notNull(),
  givenFire: integer("given_fire").default(0).notNull(),
  givenLeek: integer("given_leek").default(0).notNull(),
  givenReal: integer("given_real").default(0).notNull(),
  givenSame: integer("given_same").default(0).notNull(),
  givenSkull: integer("given_skull").default(0).notNull(),
  givenEyes: integer("given_eyes").default(0).notNull(),
  givenYipee: integer("given_yipee").default(0).notNull(),
  givenPingGood: integer("given_ping_good").default(0).notNull(),
  givenPingBad: integer("given_ping_bad").default(0).notNull(),
  // JSON field for tracking all other reactions given by user
  otherGivenReactions: json("other_given_reactions").default({}).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Slack User ID
  teamId: text("team_id"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const priorityChannels = pgTable("priority_channels", {
  channelId: text("channel_id").primaryKey(),
  channelName: text("channel_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reactionEvents = pgTable("reaction_events", {
  id: serial("id").primaryKey(),
  messageTs: text("message_ts").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  reactionName: text("reaction_name").notNull(),
  eventType: text("event_type").notNull(), // 'added' or 'removed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}); 

