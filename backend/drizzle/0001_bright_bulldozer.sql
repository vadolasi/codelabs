CREATE TABLE "workspace_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"emails" json,
	"token" text NOT NULL,
	"created_at" timestamp (0) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp (0) with time zone DEFAULT now(),
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;