"use client";

import { useState } from "react";
import { EventList } from "./EventList";
import { PlayerRow } from "./PlayerRow";
import { Scoreboard } from "./Scoreboard";
import { EmptyState, Tabs } from "./ui";
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
  const sides: { side: Side; name: string }[] = [
    { side: "home", name: match.home_name },
    { side: "away", name: match.away_name },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-10 pt-4">
      <header className="flex items-center justify-between gap-3">
        <span className="label">{match.competition ?? "Acompanhe o jogo"}</span>
        <span role="status" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${status === "live" ? "bg-accent" : "bg-amber-300"}`} />
          {STATUS_TEXT[status]}
        </span>
      </header>

      <Scoreboard state={state} />

      {(match.referee || match.assistants) && (
        <p className="soft text-center text-base">Arbitragem: {[match.referee, match.assistants].filter(Boolean).join(" · ")}</p>
      )}

      <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />
      <div className="grid gap-6 md:grid-cols-2">
        {sides.map(({ side, name }) => {
          const { field, out } = playersOf(state, side);
          return (
            <section key={side} className={`flex-col gap-2 ${tab === side ? "flex" : "hidden md:flex"}`} aria-label={name}>
              <h2 className="mb-1 hidden border-b border-white/15 pb-2 text-2xl font-bold md:block">{name}</h2>
              {field.length === 0 && <EmptyState>Escalação ainda não divulgada.</EmptyState>}
              {field.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  replacedName={p.replaced_player_id ? byId.get(p.replaced_player_id)?.name : null}
                  tally={tally(active, p.id)}
                />
              ))}
              {out.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  <span className="label">Substituídos</span>
                  {out.map((p) => (
                    <PlayerRow key={p.id} player={p} struck muted tally={tally(active, p.id)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <EventList state={state} open />
    </main>
  );
}
