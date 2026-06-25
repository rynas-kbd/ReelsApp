-- Allow ig_url to be null for photo posts / carousels shared via Instagram DM
-- (they don't have a clean instagram.com/reel/ URL — only a lookaside CDN URL)
ALTER TABLE reels ALTER COLUMN ig_url DROP NOT NULL;
