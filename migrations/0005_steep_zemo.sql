CREATE TABLE "licitaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"numero_licitacion" text NOT NULL,
	"cliente" text NOT NULL,
	"estado" text DEFAULT 'abierta' NOT NULL,
	"fecha_cierre" text,
	"presupuesto" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "licitaciones_numero_licitacion_unique" UNIQUE("numero_licitacion")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"legal_representative" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text NOT NULL,
	"unit_measure" text DEFAULT '' NOT NULL,
	"tech_requirements" text DEFAULT '' NOT NULL,
	"version_reference" text DEFAULT '' NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"internal_folio" text NOT NULL,
	"destination_company" text NOT NULL,
	"requisition_number" text NOT NULL,
	"project_title" text NOT NULL,
	"quote_date" text NOT NULL,
	"commercial_terms" text NOT NULL,
	"validity_days" integer DEFAULT 120 NOT NULL,
	"payment_days" integer DEFAULT 0 NOT NULL,
	"delivery_time" text DEFAULT '' NOT NULL,
	"manufacturing_time" text DEFAULT '' NOT NULL,
	"guarantee_months" integer DEFAULT 0 NOT NULL,
	"compliance_percentage" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"delivery_place" text DEFAULT '' NOT NULL,
	"contact_person" text DEFAULT '' NOT NULL,
	"provider_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_internal_folio_unique" UNIQUE("internal_folio")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "folders" DROP CONSTRAINT "folders_parent_id_folders_id_fk";
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "supplier" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "size" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "correo" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "correo" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "archivo";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_correo_unique" UNIQUE("correo");