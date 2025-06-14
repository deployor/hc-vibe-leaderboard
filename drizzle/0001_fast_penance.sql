CREATE TABLE "opted_out_users" (
	"slack_user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "channel_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "total_reactions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "thread_ts" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_thread_reply" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "parent_content" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "parent_user_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_message_ts_unique" UNIQUE("message_ts");