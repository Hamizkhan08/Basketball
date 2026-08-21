-- ============================================================
-- 3x3 Basketball Tournament Platform
-- Complete Database Schema + RLS + Storage
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  college TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  tournament_date DATE,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  -- Game Rules (FIBA 3x3 defaults)
  match_duration_seconds INTEGER NOT NULL DEFAULT 600,
  shot_clock_seconds INTEGER NOT NULL DEFAULT 12,
  winning_score INTEGER NOT NULL DEFAULT 21,
  inside_arc_points INTEGER NOT NULL DEFAULT 1,
  outside_arc_points INTEGER NOT NULL DEFAULT 2,
  free_throw_points INTEGER NOT NULL DEFAULT 1,
  -- Points Table Rules
  win_points INTEGER NOT NULL DEFAULT 2,
  draw_points INTEGER NOT NULL DEFAULT 1,
  loss_points INTEGER NOT NULL DEFAULT 0,
  -- Overtime
  overtime_target INTEGER NOT NULL DEFAULT 2,
  -- Format
  tournament_format TEXT NOT NULL DEFAULT 'round_robin' CHECK (tournament_format IN ('round_robin', 'league', 'knockout', 'group_knockout')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  captain_player_id UUID, -- FK added after players table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER NOT NULL,
  position TEXT DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate jersey numbers within the same team
  UNIQUE (team_id, jersey_number)
);

-- Add captain FK after players
ALTER TABLE public.teams
  ADD CONSTRAINT teams_captain_fk
  FOREIGN KEY (captain_player_id)
  REFERENCES public.players(id)
  ON DELETE SET NULL;

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  team_a_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scheduled_date DATE,
  scheduled_time TIME,
  court TEXT DEFAULT 'Court 1',
  round TEXT DEFAULT 'League',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  -- Scores
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  winner_team_id UUID REFERENCES public.teams(id),
  is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
  -- Game clock state (server-authoritative)
  game_clock_seconds INTEGER NOT NULL DEFAULT 600,
  shot_clock_seconds INTEGER NOT NULL DEFAULT 12,
  game_clock_running BOOLEAN NOT NULL DEFAULT FALSE,
  shot_clock_running BOOLEAN NOT NULL DEFAULT FALSE,
  last_clock_update TIMESTAMPTZ,
  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent team vs itself
  CONSTRAINT no_self_match CHECK (team_a_id <> team_b_id),
  -- Unique match number within tournament
  UNIQUE (tournament_id, match_number)
);

-- ============================================================
-- MATCH EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'one_point', 'two_point', 'free_throw',
    'foul', 'timeout', 'shot_clock_violation',
    'game_start', 'game_end', 'overtime_start'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  game_clock_seconds INTEGER NOT NULL DEFAULT 0,
  shot_clock_seconds INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAYER MATCH STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  one_point_scores INTEGER NOT NULL DEFAULT 0,
  two_point_scores INTEGER NOT NULL DEFAULT 0,
  free_throws INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_id)
);

-- ============================================================
-- TEAM MATCH STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points_for INTEGER NOT NULL DEFAULT 0,
  points_against INTEGER NOT NULL DEFAULT 0,
  result TEXT CHECK (result IN ('win', 'draw', 'loss')),
  win INTEGER NOT NULL DEFAULT 0,
  draw INTEGER NOT NULL DEFAULT 0,
  loss INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, team_id)
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_teams_updated
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_players_updated
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON public.teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON public.match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON public.match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON public.player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON public.player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_match ON public.team_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team ON public.team_match_stats(team_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_match_stats ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ
CREATE POLICY "Public can read tournaments" ON public.tournaments FOR SELECT USING (TRUE);
CREATE POLICY "Public can read teams" ON public.teams FOR SELECT USING (TRUE);
CREATE POLICY "Public can read players" ON public.players FOR SELECT USING (TRUE);
CREATE POLICY "Public can read matches" ON public.matches FOR SELECT USING (TRUE);
CREATE POLICY "Public can read match_events" ON public.match_events FOR SELECT USING (TRUE);
CREATE POLICY "Public can read player_match_stats" ON public.player_match_stats FOR SELECT USING (TRUE);
CREATE POLICY "Public can read team_match_stats" ON public.team_match_stats FOR SELECT USING (TRUE);

-- ADMIN WRITE (authenticated users)
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert teams" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert players" ON public.players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update players" ON public.players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete players" ON public.players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert matches" ON public.matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update matches" ON public.matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert match_events" ON public.match_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update match_events" ON public.match_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete match_events" ON public.match_events FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert player_match_stats" ON public.player_match_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update player_match_stats" ON public.player_match_stats FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete player_match_stats" ON public.player_match_stats FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert team_match_stats" ON public.team_match_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update team_match_stats" ON public.team_match_stats FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete team_match_stats" ON public.team_match_stats FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('logos', 'logos', TRUE),
  ('players', 'players', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public can view player photos" ON storage.objects FOR SELECT USING (bucket_id = 'players');
CREATE POLICY "Admins can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('logos', 'players') AND auth.role() = 'authenticated');
CREATE POLICY "Admins can update logos" ON storage.objects FOR UPDATE USING (bucket_id IN ('logos', 'players') AND auth.role() = 'authenticated');
CREATE POLICY "Admins can delete logos" ON storage.objects FOR DELETE USING (bucket_id IN ('logos', 'players') AND auth.role() = 'authenticated');

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
-- Run in Supabase Dashboard -> Database -> Replication
-- Or execute:
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_match_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_match_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
