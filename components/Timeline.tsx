"use client";

import { useState } from "react";
import { Card, PitchIllustration } from "./ui";
import { activeEvents, teamName } from "@/lib/game-logic";
import type { EventView, ViewState } from "@/lib/types";

const ICON: Record<EventView["type"], string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub_in: "🔄" };

function describe(s: ViewState, e: EventView) {
  const byId = new Map(s.players.map((p) => [p.id, p]));
  const p = byId.get(e.player_id);
  const team = p ? teamName(s.match, p.side) : "";
  if (e.type === "sub_in") {
    const o = e.related_player_id ? byId.get(e.related_player_id) : undefined;
    return {
      title: `Entra ${p ? `${p.shirt_number} ${p.name}` : "jogador"}`,
      detail: `${o ? `sai ${o.shirt_number} ${o.name} · ` : ""}${team}`,
    };
  }
  const verb = e.type === "goal" ? "Gol" : e.type === "yellow" ? "Cartão amarelo" : "Cartão vermelho";
  return { title: `${verb} · ${p ? `${p.shirt_number} ${p.name}` : "jogador"}`, detail: team };
}

/** Linha do tempo: lateral e recolhível no desktop; bloco recolhível abaixo dos times no tablet/celular. */
export function Timeline({ state, defaultOpen = true }: { state: ViewState; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const events = activeEvents(state);

  return (
    <aside
      aria-label="Linha do tempo"
      className={`hide-in-broadcast w-full shrink-0 transition-[width] duration-150 ease-out lg:sticky lg:top-[72px] lg:self-start ${
        open ? "lg:w-[340px]" : "lg:w-14"
      }`}
    >
      <Card className="overflow-hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left transition-colors duration-150 hover:bg-white/[0.04]"
        >
          <span className={`flex items-center gap-2 ${open ? "" : "lg:hidden"}`}>
            <span className="text-[17px] font-bold">Linha do tempo</span>
            <span className="tnum rounded-full bg-white/[0.07] px-2 text-sm text-muted">{events.length}</span>
          </span>
          <span className={`text-muted transition-transform duration-150 ${open ? "rotate-180 lg:-rotate-90" : "lg:rotate-90"}`} aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <ol className="flex max-h-[60vh] flex-col overflow-y-auto border-t border-line lg:max-h-[calc(100vh-190px)]">
            {events.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <PitchIllustration className="w-24 text-white/30" />
                <p className="soft text-[15px]">Os lances aparecem aqui, na ordem em que acontecem.</p>
              </li>
            )}
            {[...events].reverse().map((e) => {
              const d = describe(state, e);
              return (
                <li key={e.id} className="row-in flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="tnum mt-0.5 w-9 shrink-0 text-right text-[15px] font-bold text-muted">{e.minute != null ? `${e.minute}'` : "—"}</span>
                  <span className="text-lg leading-none" aria-hidden="true">
                    {ICON[e.type]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-snug">{d.title}</span>
                    <span className="block truncate text-[13px] text-faint">{d.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </aside>
  );
}
