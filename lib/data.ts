import { getDb } from "./supabase-server";
import type { Match, MatchState, Player, GameEvent, ViewState, MatchStatus, Period, EventType } from "./types";

export interface RecentEvent {
  type: EventType;
  minute: number | null;
  player: string;
}

export interface MatchSummary {
  id: string;
  home_name: string;
  away_name: string;
  competition: string | null;
  status: MatchStatus;
  period: Period;
  clock_running: boolean;
  clock_base_seconds: number;
  clock_started_at: string | null;
  created_at: string;
  score: { home: number; away: number };
  starters: { home: number; away: number };
  /** Últimos lances (só preenchido para jogos ao vivo), do mais recente para o mais antigo. */
  recent: RecentEvent[];
}

type Side = "home" | "away";

export async function listMatches(): Promise<MatchSummary[]> {
  const db = getDb();
  const { data, error } = await db
    .from("matches")
    .select("id, home_name, away_name, competition, status, period, clock_running, clock_base_seconds, clock_started_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Omit<MatchSummary, "score" | "starters" | "recent">[];
  const ids = rows.map((r) => r.id);
  const liveIds = rows.filter((r) => r.status === "live").map((r) => r.id);

  const score = new Map<string, { home: number; away: number }>(rows.map((r) => [r.id, { home: 0, away: 0 }]));
  const starters = new Map<string, { home: number; away: number }>(rows.map((r) => [r.id, { home: 0, away: 0 }]));
  const recent = new Map<string, RecentEvent[]>(rows.map((r) => [r.id, []]));

  if (ids.length > 0) {
    const [events, players] = await Promise.all([
      db
        .from("events")
        .select("match_id, player_id, type, minute, created_at")
        .in("match_id", ids)
        .eq("undone", false)
        .order("created_at", { ascending: false }),
      db.from("players").select("id, match_id, side, name, status, is_starter").in("match_id", ids),
    ]);
    if (!events.error && !players.error) {
      const live = (players.data ?? []).filter((p) => p.status !== "removed");
      const byId = new Map(live.map((p) => [p.id as string, p]));
      for (const p of live) {
        if (p.is_starter) starters.get(p.match_id as string)![p.side as Side] += 1;
      }
      for (const e of events.data ?? []) {
        const p = byId.get(e.player_id as string);
        if (!p) continue;
        const mid = e.match_id as string;
        if (e.type === "goal") score.get(mid)![p.side as Side] += 1;
        const list = recent.get(mid)!;
        if (liveIds.includes(mid) && list.length < 3) {
          list.push({ type: e.type as EventType, minute: (e.minute as number | null) ?? null, player: p.name as string });
        }
      }
    }
  }
  return rows.map((r) => ({ ...r, score: score.get(r.id)!, starters: starters.get(r.id)!, recent: recent.get(r.id)! }));
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
