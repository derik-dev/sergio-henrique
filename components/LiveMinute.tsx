"use client";

import { useNow } from "@/lib/hooks";
import { currentMinute } from "@/lib/game-logic";
import type { MatchView } from "@/lib/types";

type ClockInput = Pick<MatchView, "period" | "clock_running" | "clock_base_seconds" | "clock_started_at">;

/** Minuto do jogo no card da Home (atualiza sozinho enquanto o relógio corre). */
export function LiveMinute({ clock }: { clock: ClockInput }) {
  const now = useNow(clock.clock_running);
  if (clock.period === "halftime") return <span>Intervalo</span>;
  const min = currentMinute(clock as MatchView, now);
  return <span className="tnum">{min != null ? `${min}'` : "—"}</span>;
}
