import { getDb } from "./supabase-server";
import type { Match, MatchState, Player, GameEvent, ViewState, MatchStatus, Period } from "./types";

export interface MatchSummary {
  id: string;
  home_name: string;
  away_name: string;
  competition: string | null;
  status: MatchStatus;
  period: Period;
  created_at: string;
}

export async function listMatches(): Promise<MatchSummary[]> {
  const { data, error } = await getDb()
    .from("matches")
    .select("id, home_name, away_name, competition, status, period, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as MatchSummary[];
}

async function loadByMatch(match: Match): Promise<MatchState> {
  const db = getDb();
  const [p, e] = await Promise.all([
    db.from("players").select("*").eq("match_id", match.id).order("created_at"),
    db.from("events").select("*").eq("match_id", match.id).order("created_at"),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (e.error) throw new Error(e.error.message);
  return { match, players: (p.data ?? []) as Player[], events: (e.data ?? []) as GameEvent[] };
}

export async function getMatchState(id: string): Promise<MatchState | null> {
  const { data, error } = await getDb().from("matches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? loadByMatch(data as Match) : null;
}

/** Estado para o link público: o ID de edição NUNCA sai daqui. */
export async function getViewStateByToken(token: string): Promise<ViewState | null> {
  const { data, error } = await getDb().from("matches").select("*").eq("public_token", token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const full = await loadByMatch(data as Match);
  const { id: _id, ...match } = full.match;
  void _id;
  return {
    match,
    players: full.players.map(({ match_id: _m, ...p }) => (void _m, p)),
    events: full.events.map(({ match_id: _m, ...e }) => (void _m, e)),
  };
}
