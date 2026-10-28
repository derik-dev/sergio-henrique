"use client";

import { useState } from "react";
import { Button, Sheet } from "./ui";
import { useNow } from "@/lib/hooks";
import { PERIOD_LABEL, elapsedSeconds, formatClock, score } from "@/lib/game-logic";
import type { Op } from "@/lib/schemas";
import type { ViewState } from "@/lib/types";

type Clock = Extract<Op, { kind: "clock" }>["action"];

/** Placar + cronômetro. Sem `onClock`, é somente leitura (link ao vivo). */
export function Scoreboard({ state, onClock }: { state: ViewState; onClock?: (action: Clock, seconds?: number) => void }) {
  const m = state.match;
  const now = useNow(m.clock_running);
  const sc = score(state);
  const [adjusting, setAdjusting] = useState(false);
  const seconds = elapsedSeconds(m, now);

  return (
    <section aria-label="Placar" className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="line-clamp-2 break-words text-right text-xl font-bold leading-tight md:text-2xl">{m.home_name}</p>
        <p className="score text-5xl font-extrabold tabular-nums tracking-tight" aria-label={`${sc.home} a ${sc.away}`}>
          {sc.home}<span className="px-2 text-white/35">x</span>{sc.away}
        </p>
        <p className="line-clamp-2 break-words text-xl font-bold leading-tight md:text-2xl">{m.away_name}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <span className="label">{PERIOD_LABEL[m.period]}</span>
        <button
          type="button"
          disabled={!onClock}
          onClick={() => setAdjusting(true)}
          aria-label={onClock ? "Ajustar cronômetro" : undefined}
          className="min-h-12 rounded-xl px-3 text-4xl font-bold tabular-nums disabled:cursor-default"
        >
          {formatClock(seconds)}
        </button>
        {onClock && (
          <div className="flex flex-wrap justify-center gap-2">
            {m.period === "pre" && (
              <Button variant="primary" onClick={() => onClock("start")}>
                ▶ Iniciar jogo
              </Button>
            )}
            {(m.period === "first" || m.period === "second") && (
              <Button variant={m.clock_running ? "default" : "primary"} onClick={() => onClock(m.clock_running ? "pause" : "start")}>
                {m.clock_running ? "⏸ Pausar" : "▶ Retomar"}
              </Button>
            )}
            {m.period === "first" && <Button onClick={() => onClock("halftime")}>Intervalo</Button>}
            {m.period === "halftime" && (
              <Button variant="primary" onClick={() => onClock("second_half")}>
                ▶ 2º tempo
              </Button>
            )}
          </div>
        )}
      </div>

      {adjusting && onClock && (
        <AdjustSheet
          seconds={seconds}
          onClose={() => setAdjusting(false)}
          onApply={(s) => {
            onClock("set", s);
            setAdjusting(false);
          }}
        />
      )}
    </section>
  );
}

function AdjustSheet({ seconds, onClose, onApply }: { seconds: number; onClose: () => void; onApply: (s: number) => void }) {
  const [min, setMin] = useState(String(Math.floor(seconds / 60)));
  const n = Number(min);
  const valid = min !== "" && Number.isInteger(n) && n >= 0 && n <= 200;
  const step = (d: number) => setMin(String(Math.max(0, (Number.isNaN(n) ? 0 : n) + d)));
  return (
    <Sheet title="Ajustar cronômetro" onClose={onClose}>
      <p className="soft">Informe o minuto do jogo. Os segundos recomeçam do zero.</p>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Button onClick={() => step(-1)} aria-label="Um minuto a menos" className="!min-h-14 !px-6 !text-2xl">
          −
        </Button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-label="Minuto"
          className="!text-center !text-3xl !font-bold"
        />
        <Button onClick={() => step(1)} aria-label="Um minuto a mais" className="!min-h-14 !px-6 !text-2xl">
          +
        </Button>
      </div>
      <Button variant="primary" disabled={!valid} onClick={() => onApply(n * 60)}>
        Aplicar
      </Button>
    </Sheet>
  );
}
