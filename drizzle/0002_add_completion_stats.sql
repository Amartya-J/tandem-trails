ALTER TABLE `trail_rooms` ADD COLUMN `started_at` integer;
ALTER TABLE `trail_rooms` ADD COLUMN `falls` integer DEFAULT 0 NOT NULL;
