export type Side = "home" | "away";
export type MatchStatus = "lineup" | "live" | "finished";
export type Period = "pre" | "first" | "halftime" | "second" | "ended";
export type PlayerStatus = "on_field" | "bench" | "subbed_out" | "removed";
export type EventType = "goal" | "yellow" | "red" | "sub_in";

// "View" types não carregam o ID de edição do jogo: são o que o link público (somente leitura) recebe.
export interface MatchView {
  public_token: string;
  home_name: string;
  away_name: string;
  competition: string | null;
  referee: string | null;
  assistants: string | null;
  status: MatchStatus;
  period: Period;
  clock_running: boolean;
  clock_base_seconds: number;
  clock_started_at: string | null;
  created_at: string;
}

export interface PlayerView {
  id: string;
  side: Side;
  name: string;
  shirt_number: number;
  is_starter: boolean;
  slot: number | null;
  status: PlayerStatus;
  replaced_player_id: string | null;
  created_at: string;
}

export interface EventView {
  id: string;
  player_id: string;
  type: EventType;
  related_player_id: string | null;
  minute: number | null;
  undone: boolean;
  created_at: string;
}

export interface Match extends MatchView {
  id: string;
}
export interface Player extends PlayerView {
  match_id: string;
}
export interface GameEvent extends EventView {
  match_id: string;
}

export interface MatchState {
  match: Match;
  players: Player[];
  events: GameEvent[];
}

export interface ViewState {
  match: MatchView;
  players: PlayerView[];
  events: EventView[];
}

export type Result<T = void> = ({ ok: true } & (T extends void ? object : { data: T })) | { ok: false; error: string };
