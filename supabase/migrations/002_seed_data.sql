-- ============================================================
-- DUMMY DATA SEED SCRIPT
-- Run this in your Supabase SQL Editor to test the features!
-- ============================================================

-- 1. Create a Dummy Tournament (returns the ID)
DO $$
DECLARE
  v_tournament_id UUID;
  v_team_red UUID;
  v_team_blu UUID;
  v_team_grn UUID;
  v_team_yel UUID;
  v_match1 UUID;
  v_match2 UUID;
  v_match3 UUID;
  v_match4 UUID;
BEGIN
  -- Insert Tournament
  INSERT INTO public.tournaments (name, college, venue, tournament_date, status)
  VALUES ('GBL 3x3', 'State University', 'GCOERC basketball court nashik', CURRENT_DATE, 'active')
  RETURNING id INTO v_tournament_id;

  -- 2. Insert Teams
  INSERT INTO public.teams (tournament_id, name, short_name, college) VALUES (v_tournament_id, 'Red Panthers', 'RED', 'State Univ') RETURNING id INTO v_team_red;
  INSERT INTO public.teams (tournament_id, name, short_name, college) VALUES (v_tournament_id, 'Blue Hawks', 'BLU', 'City College') RETURNING id INTO v_team_blu;
  INSERT INTO public.teams (tournament_id, name, short_name, college) VALUES (v_tournament_id, 'Green Vipers', 'GRN', 'Tech Inst') RETURNING id INTO v_team_grn;
  INSERT INTO public.teams (tournament_id, name, short_name, college) VALUES (v_tournament_id, 'Yellow Titans', 'YEL', 'West State') RETURNING id INTO v_team_yel;

  -- 3. Insert Players
  -- Red Panthers
  INSERT INTO public.players (team_id, name, jersey_number, position) VALUES 
    (v_team_red, 'John Smith', 1, 'Guard'),
    (v_team_red, 'Mike Johnson', 2, 'Forward'),
    (v_team_red, 'Alex Williams', 3, 'Center'),
    (v_team_red, 'Chris Brown', 4, 'Guard');
  
  -- Blue Hawks
  INSERT INTO public.players (team_id, name, jersey_number, position) VALUES 
    (v_team_blu, 'David Jones', 5, 'Guard'),
    (v_team_blu, 'Sam Garcia', 6, 'Forward'),
    (v_team_blu, 'Dan Miller', 7, 'Center'),
    (v_team_blu, 'Tom Davis', 8, 'Guard');

  -- Green Vipers
  INSERT INTO public.players (team_id, name, jersey_number, position) VALUES 
    (v_team_grn, 'James Rodriguez', 9, 'Guard'),
    (v_team_grn, 'Ryan Martinez', 10, 'Forward'),
    (v_team_grn, 'Josh Hernandez', 11, 'Center'),
    (v_team_grn, 'Ben Lopez', 12, 'Guard');

  -- Yellow Titans
  INSERT INTO public.players (team_id, name, jersey_number, position) VALUES 
    (v_team_yel, 'Will Gonzalez', 13, 'Guard'),
    (v_team_yel, 'Luke Wilson', 14, 'Forward'),
    (v_team_yel, 'Matt Anderson', 15, 'Center'),
    (v_team_yel, 'Nick Thomas', 16, 'Guard');

  -- 4. Insert Matches
  -- Match 1: RED vs BLU (Completed)
  INSERT INTO public.matches (tournament_id, match_number, team_a_id, team_b_id, status, court, round, game_clock_seconds, team_a_score, team_b_score)
  VALUES (v_tournament_id, 1, v_team_red, v_team_blu, 'completed', 'Court 1', 'Group Stage', 600, 21, 15)
  RETURNING id INTO v_match1;

  -- Match 2: GRN vs YEL (Completed)
  INSERT INTO public.matches (tournament_id, match_number, team_a_id, team_b_id, status, court, round, game_clock_seconds, team_a_score, team_b_score)
  VALUES (v_tournament_id, 2, v_team_grn, v_team_yel, 'completed', 'Court 2', 'Group Stage', 600, 19, 21)
  RETURNING id INTO v_match2;

  -- Match 3: RED vs GRN (Live)
  INSERT INTO public.matches (tournament_id, match_number, team_a_id, team_b_id, status, court, round, game_clock_seconds, team_a_score, team_b_score, game_clock_running)
  VALUES (v_tournament_id, 3, v_team_red, v_team_grn, 'live', 'Court 1', 'Group Stage', 300, 12, 14, true)
  RETURNING id INTO v_match3;

  -- Match 4: BLU vs YEL (Scheduled)
  INSERT INTO public.matches (tournament_id, match_number, team_a_id, team_b_id, status, court, round, game_clock_seconds, team_a_score, team_b_score)
  VALUES (v_tournament_id, 4, v_team_blu, v_team_yel, 'scheduled', 'Court 2', 'Group Stage', 0, 0, 0)
  RETURNING id INTO v_match4;

  -- 5. Insert Team Match Stats for Completed Matches
  -- Match 1 (RED won)
  INSERT INTO public.team_match_stats (match_id, team_id, win, loss, draw, points_for, points_against)
  VALUES 
    (v_match1, v_team_red, 1, 0, 0, 21, 15),
    (v_match1, v_team_blu, 0, 1, 0, 15, 21);
  
  -- Match 2 (YEL won)
  INSERT INTO public.team_match_stats (match_id, team_id, win, loss, draw, points_for, points_against)
  VALUES 
    (v_match2, v_team_grn, 0, 1, 0, 19, 21),
    (v_match2, v_team_yel, 1, 0, 0, 21, 19);

  -- 6. Insert Player Stats
  -- Just give some points to the first player of each team
  INSERT INTO public.player_match_stats (match_id, player_id, team_id, total_points, one_point_scores, two_point_scores)
  VALUES 
    (v_match1, (SELECT id FROM public.players WHERE team_id = v_team_red LIMIT 1), v_team_red, 10, 4, 3),
    (v_match1, (SELECT id FROM public.players WHERE team_id = v_team_blu LIMIT 1), v_team_blu, 8, 4, 2),
    (v_match2, (SELECT id FROM public.players WHERE team_id = v_team_grn LIMIT 1), v_team_grn, 12, 6, 3),
    (v_match2, (SELECT id FROM public.players WHERE team_id = v_team_yel LIMIT 1), v_team_yel, 15, 5, 5);

END $$;
