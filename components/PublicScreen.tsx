"use client";

import { useState } from "react";
import { PlayerRow } from "./PlayerRow";
import { Scoreboard } from "./Scoreboard";
import { Timeline } from "./Timeline";
import { Badge, Card, EmptyState, Tabs, TeamCrest } from "./ui";
import { activeEvents, playersOf, tally } from "@/lib/game-logic";
import { useLiveState, type LiveStatus } from "@/lib/hooks";
import type { Side, ViewState } from "@/lib/types";

const STATUS_TEXT: Record<LiveStatus, string> = { connecting: "Conectando…", live: "Ao vivo", reconnecting: "Reconectando…" };

export function PublicScreen({ token, initial }: { token: string; initial: ViewState }) {
  const { state, status } = useLiveState(token, initial);
  const [tab, setTab] = useState<Side>("home");
  const active = activeEvents(state);
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const { match } = state;
  const sides: { side: Side; name: string; role: string }[] = [
    { side: "home", name: match.home_name, role: "Casa" },
    { side: "away", name: match.away_name, role: "Visitante" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="label">{match.competition ?? "Acompanhe o jogo"}</span>
        <Badge tone={status === "live" ? "live" : "warn"} pulse={status === "live"}>
          {STATUS_TEXT[status]}
        </Badge>
      </header>

      <Scoreboard state={state} />

      {(match.referee || match.assistants) && (
        <p className="soft text-center text-[15px]">Arbitragem: {[match.referee, match.assistants].filter(Boolean).join(" · ")}</p>
      )}

      <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="grid min-w-0 flex-1 gap-5 md:grid-cols-2">
          {sides.map(({ side, name, role }) => {
            const { field, out } = playersOf(state, side);
            return (
              <section key={side} className={tab === side ? "block" : "hidden md:block"} aria-label={name}>
                <Card className="flex flex-col gap-2 p-3 md:p-4">
                  <div className="mb-1 flex items-center gap-3 border-b border-line pb-3">
                    <TeamCrest name={name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="label">{role}</p>
                      <h2 className="truncate text-xl font-bold">{name}</h2>
                    </div>
                  </div>
                  {field.length === 0 && (
                    <EmptyState compact title="Escalação em breve">
                      Assim que o narrador cadastrar, os jogadores aparecem aqui.
                    </EmptyState>
                  )}
                  {field.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      replacedName={p.replaced_player_id ? byId.get(p.replaced_player_id)?.name : null}
                      tally={tally(active, p.id)}
                    />
                  ))}
                  {out.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <span className="label">Substituídos</span>
                      {out.map((p) => (
                        <PlayerRow key={p.id} player={p} struck muted tally={tally(active, p.id)} />
                      ))}
                    </div>
                  )}
                </Card>
              </section>
            );
          })}
        </div>
        <Timeline state={state} />
      </div>
    </main>
  );
}
