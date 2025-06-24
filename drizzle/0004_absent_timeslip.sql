CREATE TABLE "priority_channels" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"channel_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_ts" text NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reaction_name" text NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "yay" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sob" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "heart" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "star" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "fire" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "yipee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "given_yipee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "other_given_reactions" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "hearts";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "yipee_parrot";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "nooo";--> statement-breakpoint
ALTER TABLE "user_stats" DROP COLUMN "given_hearts";--> statement-breakpoint
ALTER TABLE "user_stats" DROP COLUMN "given_yipee_parrot";--> statement-breakpoint
ALTER TABLE "user_stats" DROP COLUMN "given_nooo";