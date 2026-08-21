-- Add pool_name to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS pool_name TEXT;
