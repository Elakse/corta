CREATE TABLE `annotations` (
	`node_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gcal_links` (
	`entity_id` text PRIMARY KEY NOT NULL,
	`google_event_id` text NOT NULL,
	`hash` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`node_id` text PRIMARY KEY NOT NULL,
	`done` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`node_id` text NOT NULL,
	`done` integer NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_events_node` ON `progress_events` (`node_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start` text NOT NULL,
	`duration_min` integer NOT NULL,
	`course_key` text NOT NULL,
	`evaluation_key` text,
	`topic_id` text,
	`goal` text,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
