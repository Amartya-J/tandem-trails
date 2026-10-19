-- Existing local/hosted D1 databases created from 0000 need this column.
ALTER TABLE `trail_players` ADD COLUMN `last_seen` integer DEFAULT 0 NOT NULL;
