CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_ts" text NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"content" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "message_ts_idx" ON "messages" USING btree ("message_ts");