CREATE TABLE "user_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"user_name" text NOT NULL,
	"avatar_url" text,
	"given_upvotes" integer DEFAULT 0 NOT NULL,
	"given_downvotes" integer DEFAULT 0 NOT NULL,
	"given_yay" integer DEFAULT 0 NOT NULL,
	"given_sob" integer DEFAULT 0 NOT NULL,
	"given_heart" integer DEFAULT 0 NOT NULL,
	"given_star" integer DEFAULT 0 NOT NULL,
	"given_fire" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
