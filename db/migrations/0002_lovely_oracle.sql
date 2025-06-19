CREATE TABLE IF NOT EXISTS "user_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"word" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "todos";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "max_mode" boolean DEFAULT false NOT NULL;