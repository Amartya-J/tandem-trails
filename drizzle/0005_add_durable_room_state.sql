ALTER TABLE `trail_rooms` ADD COLUMN `state_json` text;
--> statement-breakpoint
CREATE TABLE `trail_sessions` (
  `token` text PRIMARY KEY NOT NULL,
  `room_code` text NOT NULL,
  `player_index` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_trail_sessions_room` ON `trail_sessions` (`room_code`);
