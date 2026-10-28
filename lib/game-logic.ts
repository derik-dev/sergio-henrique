import type {
  EventView,
  GameEvent,
  Match,
  MatchState,
  MatchView,
  Period,
  Player,
  PlayerView,
  Side,
  ViewState,
} from "./types";
import type { Op } from "./schemas";

export const SECOND_HALF_START = 45 * 60;

// ---------- Cronômetro ----------
type ClockSource = Pick<MatchView, "clock_running" | "clock_started_at" | "clock_base_seconds">;

export function elapsedSeconds(m: ClockSource, nowMs: number): number {
  if (!m.clock_running || !m.clock_started_at) return m.clock_base_seconds;
  const delta = Math.floor((nowMs - Date.parse(m.clock_started_at)) / 1000);
  return m.clock_base_seconds + Math.max(0, delta);
}

/** Minuto do jogo (1-based, como na narração: aos 23'45" estamos no minuto 24). */
export function currentMinute(m: MatchView, nowMs: number): number | null {
  if (m.period === "pre") return null;
  return Math.floor(elapsedSeconds(m, nowMs) / 60) + 1;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type ClockFields = Pick<Match, "status" | "period" | "clock_running" | "clock_base_seconds" | "clock_started_at">;

/** Colunas de cronômetro/status após uma operação. Usada no cliente (otimista) e no servidor. */
export function clockPatch(m: ClockFields, op: Op): Partial<ClockFields> {
  if (op.kind === "set_status") {
    const el = elapsedSeconds(m, Date.parse(op.at));
    if (op.status === "finished") {
      return { status: "finished", period: "ended", clock_running: false, clock_base_seconds: el, clock_started_at: null };
    }
    if (op.status === "live" && m.status === "finished") {
      return { status: "live", period: "second", clock_running: false, clock_base_seconds: el, clock_started_at: null };
    }
    return { status: op.status };
  }
  if (op.kind !== "clock") return {};
  const el = elapsedSeconds(m, Date.parse(op.at));
  switch (op.action) {
    case "start":
      if (m.period === "pre") {
        return { status: "live", period: "first", clock_running: true, clock_base_seconds: 0, clock_started_at: op.at };
      }
      if ((m.period === "first" || m.period === "second") && !m.clock_running) {
        return { clock_running: true, clock_started_at: op.at };
      }
      return {};
    case "pause":
      if (!m.clock_running) return {};
      return { clock_running: false, clock_base_seconds: el, clock_started_at: null };
    case "halftime":
      return { period: "halftime", clock_running: false, clock_base_seconds: el, clock_started_at: null };
    case "second_half":
      return {
        status: "live",
        period: "second",
        clock_running: true,
        clock_base_seconds: SECOND_HALF_START,
        clock_started_at: op.at,
      };
    case "set":
      return {
        clock_base_seconds: op.seconds ?? m.clock_base_seconds,
        clock_started_at: m.clock_running ? op.at : null,
      };
  }
}

export const PERIOD_LABEL: Record<Period, string> = {
  pre: "Pré-jogo",
  first: "1º tempo",
  halftime: "Intervalo",
  second: "2º tempo",
  ended: "Fim de jogo",
};

// ---------- Reducer otimista (idempotente: reaplicar uma op já aplicada não muda nada) ----------
export function applyOp(s: MatchState, op: Op): MatchState {
  const { match, players, events } = s;
  switch (op.kind) {
    case "add_player": {
      if (players.some((p) => p.id === op.id)) return s;
      const maxSlot = players.filter((p) => p.side === op.side).reduce((m, p) => Math.max(m, p.slot ?? 0), 0);
      const p: Player = {
        id: op.id,
        match_id: match.id,
        side: op.side,
        name: op.name,
        shirt_number: op.shirt_number,
        is_starter: op.is_starter,
        slot: op.is_starter ? maxSlot + 1 : null,
        status: op.is_starter ? "on_field" : "bench",
        replaced_player_id: null,
        created_at: new Date().toISOString(),
      };
      return { ...s, players: [...players, p] };
    }
    case "update_player":
      return {
        ...s,
        players: players.map((p) => (p.id === op.id ? { ...p, name: op.name, shirt_number: op.shirt_number } : p)),
      };
    case "remove_player":
      return { ...s, players: players.map((p) => (p.id === op.id ? { ...p, status: "removed" } : p)) };
    case "record_event": {
      if (events.some((e) => e.id === op.id)) return s;
      const e: GameEvent = {
        id: op.id,
        match_id: match.id,
        player_id: op.player_id,
        type: op.type,
        related_player_id: null,
        minute: op.minute,
        undone: false,
        created_at: op.at,
      };
      return { ...s, events: [...events, e] };
    }
    case "substitute": {
      if (events.some((e) => e.id === op.event_id)) return s;
      const out = players.find((p) => p.id === op.out_id);
      const inn = players.find((p) => p.id === op.in_id);
      if (!out || !inn) return s;
      const e: GameEvent = {
        id: op.event_id,
        match_id: match.id,
        player_id: inn.id,
        type: "sub_in",
        related_player_id: out.id,
        minute: op.minute,
        undone: false,
        created_at: op.at,
      };
      return {
        ...s,
        players: players.map((p) =>
          p.id === out.id
            ? { ...p, status: "subbed_out" }
            : p.id === inn.id
              ? { ...p, status: "on_field", slot: out.slot, replaced_player_id: out.id }
              : p,
        ),
        events: [...events, e],
      };
    }
    case "undo": {
      const e = events.find((x) => x.id === op.event_id);
      if (!e || e.undone) return s;
      return {
        ...s,
        events: events.map((x) => (x.id === e.id ? { ...x, undone: true } : x)),
        players:
          e.type === "sub_in"
            ? players.map((p) =>
                p.id === e.related_player_id
                  ? { ...p, status: "on_field" }
                  : p.id === e.player_id
                    ? { ...p, status: "bench", slot: null, replaced_player_id: null }
                    : p,
              )
            : players,
      };
    }
    case "clock":
    case "set_status":
      return { ...s, match: { ...match, ...clockPatch(match, op) } };
    case "update_match":
      return {
        ...s,
        match: {
          ...match,
          home_name: op.home_name ?? match.home_name,
          away_name: op.away_name ?? match.away_name,
          referee: op.referee ?? match.referee,
          assistants: op.assistants ?? match.assistants,
        },
      };
  }
}

// ---------- Seletores ----------
export function playersOf(s: ViewState, side: Side) {
  const mine = s.players.filter((p) => p.side === side && p.status !== "removed");
  const bySlot = (a: PlayerView, b: PlayerView) => (a.slot ?? 0) - (b.slot ?? 0) || a.shirt_number - b.shirt_number;
  return {
    field: mine.filter((p) => p.status === "on_field").sort(bySlot),
    bench: mine.filter((p) => p.status === "bench").sort((a, b) => a.shirt_number - b.shirt_number),
    out: mine.filter((p) => p.status === "subbed_out").sort(bySlot),
  };
}

/** Eventos válidos: não desfeitos e de jogadores que não foram excluídos. */
export function activeEvents(s: ViewState): EventView[] {
  const removed = new Set(s.players.filter((p) => p.status === "removed").map((p) => p.id));
  return s.events.filter((e) => !e.undone && !removed.has(e.player_id));
}

export function lastUndoable(s: ViewState): EventView | undefined {
  const list = activeEvents(s);
  return list[list.length - 1];
}

export function score(s: ViewState): Record<Side, number> {
  const sideOf = new Map(s.players.map((p) => [p.id, p.side]));
  const r: Record<Side, number> = { home: 0, away: 0 };
  for (const e of activeEvents(s)) {
    if (e.type !== "goal") continue;
    const sd = sideOf.get(e.player_id);
    if (sd) r[sd] += 1;
  }
  return r;
}

export function tally(events: EventView[], playerId: string) {
  const r = { goal: 0, yellow: 0, red: 0 };
  for (const e of events) {
    if (e.player_id !== playerId) continue;
    if (e.type === "goal" || e.type === "yellow" || e.type === "red") r[e.type] += 1;
  }
  return r;
}

export function teamName(m: MatchView, side: Side) {
  return side === "home" ? m.home_name : m.away_name;
}

export function describeEvent(s: ViewState, e: EventView): string {
  const byId = new Map(s.players.map((p) => [p.id, p]));
  const p = byId.get(e.player_id);
  const who = p ? `${p.shirt_number} ${p.name}` : "jogador";
  const team = p ? teamName(s.match, p.side) : "";
  const min = e.minute != null ? `${e.minute}' ` : "";
  if (e.type === "sub_in") {
    const o = e.related_player_id ? byId.get(e.related_player_id) : undefined;
    return `${min}🔄 Entra ${who}${o ? `, sai ${o.shirt_number} ${o.name}` : ""} (${team})`;
  }
  const icon = e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : "🟥";
  return `${min}${icon} ${who} (${team})`;
}

// ---------- Resumo: gerado SOMENTE a partir dos eventos registrados (sem IA, nada inventado) ----------
export function buildSummary(s: ViewState, kind: "short" | "full"): string {
  const m = s.match;
  const sc = score(s);
  const byId = new Map(s.players.map((p) => [p.id, p]));
  const evs = activeEvents(s);
  const min = (e: EventView) => (e.minute != null ? `${e.minute}'` : "");
  const line = (e: EventView, text: string) => [min(e), text].filter(Boolean).join(" ");
  const label = (id: string) => {
    const p = byId.get(id);
    return p ? `${p.name} (${teamName(m, p.side)})` : "jogador";
  };

  const head = m.status === "finished" ? "Fim de jogo" : m.status === "live" ? "Placar parcial" : "Jogo";
  const title = `${head}: ${m.home_name} ${sc.home} x ${sc.away} ${m.away_name}${m.competition ? ` (${m.competition})` : ""}`;

  const goalEvs = evs.filter((e) => e.type === "goal");
  const goals = goalEvs.map((e) => line(e, `Gol de ${label(e.player_id)}`));
  const yellows = evs.filter((e) => e.type === "yellow").map((e) => line(e, `Amarelo para ${label(e.player_id)}`));
  const reds = evs.filter((e) => e.type === "red").map((e) => line(e, `Vermelho para ${label(e.player_id)}`));
  const subs = evs
    .filter((e) => e.type === "sub_in")
    .map((e) => {
      const o = e.related_player_id ? byId.get(e.related_player_id) : undefined;
      return line(e, `${label(e.player_id)} entra${o ? ` no lugar de ${o.name}` : ""}`);
    });

  if (kind === "short") {
    const parts = [title];
    if (goalEvs.length) {
      parts.push(`Gols: ${goalEvs.map((e) => `${byId.get(e.player_id)?.name ?? "?"}${min(e) ? ` ${min(e)}` : ""}`).join(", ")}.`);
    }
    const cards = [
      yellows.length ? `${yellows.length} amarelo(s)` : "",
      reds.length ? `${reds.length} vermelho(s)` : "",
    ].filter(Boolean);
    if (cards.length) parts.push(`Cartões: ${cards.join(" e ")}.`);
    return parts.join("\n");
  }

  const out = [title];
  if (m.referee || m.assistants) out.push(`Arbitragem: ${[m.referee, m.assistants].filter(Boolean).join(" · ")}`);
  const section = (name: string, items: string[]) => {
    out.push("", `${name}:`, ...(items.length ? items.map((i) => `• ${i}`) : ["• Nenhum registrado"]));
  };
  section("Gols", goals);
  section("Cartões amarelos", yellows);
  section("Cartões vermelhos", reds);
  section("Substituições", subs);
  out.push("", "Resumo gerado a partir dos eventos registrados na transmissão.");
  return out.join("\n");
}
