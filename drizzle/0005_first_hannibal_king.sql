ALTER TABLE "messages" ADD COLUMN "other_reactions" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_placeholder" boolean DEFAULT false NOT NULL;