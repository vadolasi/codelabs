CREATE TABLE `workspace_files` (
	`hash` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`engine` text DEFAULT 'webcontainers' NOT NULL,
	`snapshot` blob NOT NULL,
	`config` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `visibility` text DEFAULT 'private' NOT NULL;