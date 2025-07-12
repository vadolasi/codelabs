CREATE TYPE "public"."database_driver" AS ENUM('postgres', 'sqlite');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp (0) with time zone DEFAULT now() NOT NULL,
	"course_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "databases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"driver" "database_driver" NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot" "bytea" NOT NULL,
	"created_at" timestamp (0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "content" SET DATA TYPE "undefined"."bytea";--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "content" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "courses_members" ADD COLUMN "class_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases" ADD CONSTRAINT "databases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses_members" ADD CONSTRAINT "courses_members_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses_members" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "updated_at";