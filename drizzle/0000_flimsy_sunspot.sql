CREATE TABLE `trail_players` (
	`token` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`name` text NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen` integer DEFAULT 0 NOT NULL,
	`x` real DEFAULT 80 NOT NULL,
	`y` real DEFAULT 388 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_trail_players_room` ON `trail_players` (`room_code`);--> statement-breakpoint
CREATE TABLE `trail_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`unlocked` integer DEFAULT 0 NOT NULL,
	`run` integer DEFAULT 0 NOT NULL,
	`collected` integer DEFAULT 0 NOT NULL,
	`gate_open` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`falls` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
