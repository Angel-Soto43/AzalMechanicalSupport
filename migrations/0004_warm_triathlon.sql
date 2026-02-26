CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" text NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_contract_id_unique";--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "archivo" "bytea";