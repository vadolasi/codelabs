ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_invites" ALTER COLUMN "expires_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "user_id";