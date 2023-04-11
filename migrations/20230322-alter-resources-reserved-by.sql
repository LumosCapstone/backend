-- Create the new column
ALTER TABLE resources ADD COLUMN reservation_status int;

-- Backfill new column NULL values
UPDATE resources SET reservation_status = 0;

-- Set new column to NOT NULL
ALTER TABLE resources ALTER COLUMN reservation_status SET NOT NULL;
