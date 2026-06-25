-- Add user notes field to reels
ALTER TABLE reels ADD COLUMN IF NOT EXISTS notes text;
