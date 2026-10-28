"use client";

import { useState } from "react";
import { Badge, Button, Card, Sheet, TeamCrest } from "./ui";
import { useNow } from "@/lib/hooks";
import { PERIOD_LABEL, elapsedSeconds, formatClock, score } from "@/lib/game-logic";
import type { Op } from "@/lib/schemas";
import type { ViewState } from "@/lib/types";

type Clock = Extract<Op, { kind: "clock" }>["action"];

/** Número que muda com uma pequena animação vertical (a `key` remonta o elemento). */
function Digit({ value }: { value: number }) {
  return (
    <span key={value} className="tick tnum">
      {value}
    </span>
  );
}

/** Placar + cronômetro. Sem `onClock`, é somente leitura (link ao vivo). */
export function Scoreboard({ state, onClock }: { state: ViewState; onClock?: (action: Clock, seconds?: number) => void }) {
  const m = state.match;
  const now = useNow(m.clock_running);
  const sc = score(state);
  const [adjusting, setAdjusting] = useState(false);
  const seconds = elapsedSeconds(m, now);

  return (
    <Card className="relative overflow-hidden p-4 md:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(closest-side,rgba(61,220,151,0.12),transparent)]" />
      <section aria-label="Placar" className="relative">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-6">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center md:flex-row md:justify-end md:text-right">
            <p className="order-2 line-clamp-2 break-words text-lg font-bold leading-tight md:order-1 md:text-2xl">{m.home_name}</p>
            <span className="order-1 md:order-2">
              <TeamCrest name={m.home_name} size={52} />
            </span>
          </div>

          <p
            className="score flex items-baseline gap-2 text-6xl font-extrabold leading-none tracking-tighter md:gap-4 md:text-7xl"
            aria-label={`${sc.home} a ${sc.away}`}
          >
            <Digit value={sc.home} />
            <span className="text-3xl text-faint md:text-4xl">–</span>
            <Digit value={sc.away} />
          </p>

          <div className="flex min-w-0 flex-col items-center gap-2 text-center md:flex-row md:justify-start md:text-left">
            <TeamCrest name={m.away_name} size={52} />
            <p className="line-clamp-2 break-words text-lg font-bold leading-tight md:text-2xl">{m.away_name}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-t border-line pt-4">
          <Badge tone={m.clock_running ? "live" : "neutral"} pulse={m.clock_running}>
            {PERIOD_LABEL[m.period]}
          </Badge>
          <button
            type="button"
            disabled={!onClock}
            onClick={() => setAdjusting(true)}
            aria-label={onClock ? "Ajustar cronômetro" : undefined}
            className="tnum min-h-12 rounded-btn px-3 text-4xl font-bold tracking-tight transition-colors duration-150 enabled:hover:bg-white/[0.06] disabled:cursor-default"
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
      </section>

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
    </Card>
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
          className="tnum !min-h-14 !text-center !text-3xl !font-bold"
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
