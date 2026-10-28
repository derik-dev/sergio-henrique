"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AddPlayerForm } from "./LineupForm";
import { EventList } from "./EventList";
import { PlayerMenu, type MenuView } from "./PlayerMenu";
import { PlayerRow } from "./PlayerRow";
import { Scoreboard } from "./Scoreboard";
import { ShareSheet } from "./ShareSheet";
import { SummarySheet } from "./SummarySheet";
import { Button, EmptyState, LinkButton, Sheet, SyncBadge, Tabs, Toast } from "./ui";
import { activeEvents, currentMinute, describeEvent, lastUndoable, playersOf, tally, teamName } from "@/lib/game-logic";
import { useWakeLock } from "@/lib/hooks";
import { useMatchStore } from "@/lib/use-match-store";
import type { MatchState, PlayerView, Side } from "@/lib/types";

type Dialog = null | { kind: "summary" | "share" | "finish" } | { kind: "add"; side: Side };

const BROADCAST_KEY = "broadcast-mode";

export function GameScreen({ initial }: { initial: MatchState }) {
  const { state, dispatch, sync, pending, notice, clearNotice } = useMatchStore(initial);
  useWakeLock();

  const [tab, setTab] = useState<Side>("home");
  const [menu, setMenu] = useState<{ id: string; view: MenuView } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [broadcast, setBroadcast] = useState(false);

  useEffect(() => {
    try {
      setBroadcast(localStorage.getItem(BROADCAST_KEY) === "1");
    } catch {
      // sem localStorage: segue desligado
    }
  }, []);
  const toggleBroadcast = () =>
    setBroadcast((b) => {
      try {
        localStorage.setItem(BROADCAST_KEY, b ? "0" : "1");
      } catch {
        // ignorar
      }
      return !b;
    });

  const { match, players } = state;
  const active = useMemo(() => activeEvents(state), [state]);
  const last = lastUndoable(state);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const menuPlayer = menu ? byId.get(menu.id) : undefined;

  const stamp = () => ({ at: new Date().toISOString(), minute: currentMinute(match, Date.now()) });

  const record = useCallback(
    (type: "goal" | "yellow" | "red", p: PlayerView) => {
      dispatch({ kind: "record_event", id: crypto.randomUUID(), player_id: p.id, type, ...stamp() });
      setMenu(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, match],
  );

  const yellow = useCallback(
    (p: PlayerView) => {
      if (tally(active, p.id).yellow >= 1) setMenu({ id: p.id, view: "second_yellow" });
      else record("yellow", p);
    },
    [active, record],
  );

  const undo = useCallback(() => {
    if (last) dispatch({ kind: "undo", event_id: last.id });
  }, [last, dispatch]);

  // Atalhos (computador): S substituir, A amarelo, V vermelho, G gol, Z desfazer.
  // Alvo = jogador do menu aberto ou a linha com foco.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "z") {
      e.preventDefault();
      return undo();
    }
    if (menu && menu.view !== "menu") return;
    const id = menu?.id ?? (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-player-id]")?.dataset.playerId;
    const p = id ? byId.get(id) : undefined;
    if (!p || p.status !== "on_field" || !["s", "a", "v", "g"].includes(k)) return;
    e.preventDefault();
    if (k === "s") setMenu({ id: p.id, view: "sub" });
    else if (k === "a") yellow(p);
    else if (k === "v") record("red", p);
    else record("goal", p);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [menu, byId, undo, yellow, record]);

  const sides: { side: Side; name: string }[] = [
    { side: "home", name: match.home_name },
    { side: "away", name: match.away_name },
  ];
  const openMenu = (p: PlayerView) => setMenu({ id: p.id, view: "menu" });
  const finished = match.status === "finished";

  return (
    <div data-broadcast={broadcast} className="min-h-screen">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-36 pt-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="hide-in-broadcast soft inline-flex min-h-11 items-center">
            ← Jogos
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <SyncBadge status={sync} pending={pending} />
            <Button variant={broadcast ? "primary" : "default"} aria-pressed={broadcast} onClick={toggleBroadcast} className="!min-h-11">
              📡 Transmissão
            </Button>
          </div>
        </header>

        <Scoreboard
          state={state}
          onClock={(action, seconds) => dispatch({ kind: "clock", action, at: new Date().toISOString(), seconds })}
        />

        {(match.referee || match.assistants || match.competition) && (
          <p className="hide-in-broadcast soft text-center text-base">
            {match.competition && <span>{match.competition} · </span>}
            Arbitragem: {[match.referee, match.assistants].filter(Boolean).join(" · ") || "não informada"}
          </p>
        )}

        <div className="hide-in-broadcast flex flex-wrap gap-2">
          <LinkButton href={`/jogos/${match.id}/escalacao`} className="!min-h-11">
            Escalação
          </LinkButton>
          <Button className="!min-h-11" onClick={() => setDialog({ kind: "share" })}>
            🔗 Link ao vivo
          </Button>
          <Button className="!min-h-11" onClick={() => setDialog({ kind: "summary" })}>
            📝 Gerar resumo
          </Button>
        </div>

        <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />

        <div className="grid gap-6 md:grid-cols-2">
          {sides.map(({ side, name }) => {
            const { field, bench, out } = playersOf(state, side);
            return (
              <section key={side} className={`flex flex-col gap-2 ${tab === side ? "block" : "hidden md:flex"}`} aria-label={name}>
                <h2 className="mb-1 hidden border-b border-white/15 pb-2 text-2xl font-bold md:block">{name}</h2>
                {field.length === 0 && <EmptyState>Nenhum titular. Cadastre a escalação.</EmptyState>}
                {field.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    replacedName={p.replaced_player_id ? byId.get(p.replaced_player_id)?.name : null}
                    tally={tally(active, p.id)}
                    onOpen={() => openMenu(p)}
                  />
                ))}

                {out.length > 0 && (
                  <div className="hide-in-broadcast mt-3 flex flex-col gap-2">
                    <span className="label">Substituídos</span>
                    {out.map((p) => (
                      <PlayerRow key={p.id} player={p} struck muted tally={tally(active, p.id)} onOpen={() => openMenu(p)} />
                    ))}
                  </div>
                )}
                {bench.length > 0 && (
                  <div className="hide-in-broadcast mt-3 flex flex-col gap-2">
                    <span className="label">Reservas</span>
                    {bench.map((p) => (
                      <PlayerRow key={p.id} player={p} muted tally={tally(active, p.id)} onOpen={() => openMenu(p)} />
                    ))}
                  </div>
                )}
                <Button variant="ghost" className="hide-in-broadcast mt-2 !justify-start" onClick={() => setDialog({ kind: "add", side })}>
                  + Adicionar jogador
                </Button>
              </section>
            );
          })}
        </div>

        <EventList state={state} />

        <div className="hide-in-broadcast">
          {finished ? (
            <Button onClick={() => dispatch({ kind: "set_status", status: "live", at: new Date().toISOString() })}>Reabrir jogo</Button>
          ) : match.status === "live" ? (
            <Button variant="danger" onClick={() => setDialog({ kind: "finish" })}>
              Encerrar jogo
            </Button>
          ) : null}
        </div>
      </main>

      {/* Barra fixa: desfazer sempre à mão */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button variant="danger" className="!min-h-14 shrink-0 !text-lg" disabled={!last} onClick={undo}>
            ↩ Desfazer último evento <kbd className="hidden rounded border border-red-300/40 px-1.5 text-xs lg:inline">Z</kbd>
          </Button>
          <p className="soft hidden min-w-0 flex-1 truncate sm:block">{last ? describeEvent(state, last) : "Nenhum evento para desfazer"}</p>
        </div>
      </div>

      {menu && menuPlayer && (
        <PlayerMenu
          key={menu.id}
          player={menuPlayer}
          bench={playersOf(state, menuPlayer.side).bench}
          view={menu.view}
          onView={(view) => setMenu({ id: menu.id, view })}
          onClose={() => setMenu(null)}
          actions={{
            onSubstitute: (inId) => {
              dispatch({ kind: "substitute", event_id: crypto.randomUUID(), out_id: menuPlayer.id, in_id: inId, ...stamp() });
              setMenu(null);
            },
            onYellow: () => yellow(menuPlayer),
            onYellowOnly: () => record("yellow", menuPlayer),
            onRed: () => record("red", menuPlayer),
            onGoal: () => record("goal", menuPlayer),
            onEdit: (name, shirt) => {
              dispatch({ kind: "update_player", id: menuPlayer.id, name, shirt_number: shirt });
              setMenu(null);
            },
            onDelete: () => {
              dispatch({ kind: "remove_player", id: menuPlayer.id });
              setMenu(null);
            },
          }}
        />
      )}

      {dialog?.kind === "summary" && <SummarySheet state={state} onClose={() => setDialog(null)} />}
      {dialog?.kind === "share" && <ShareSheet token={match.public_token} onClose={() => setDialog(null)} />}
      {dialog?.kind === "add" && (
        <Sheet title={`Adicionar a ${teamName(match, dialog.side)}`} onClose={() => setDialog(null)}>
          <p className="soft text-base">Mudança de última hora: entra sem contar como substituição.</p>
          <AddPlayerForm
            autoFocus
            starterCount={playersOf(state, dialog.side).field.length}
            onAdd={(name, shirt, isStarter) => {
              dispatch({ kind: "add_player", id: crypto.randomUUID(), side: dialog.side, name, shirt_number: shirt, is_starter: isStarter });
              setDialog(null);
            }}
          />
        </Sheet>
      )}
      {dialog?.kind === "finish" && (
        <Sheet title="Encerrar jogo?" onClose={() => setDialog(null)}>
          <p>O cronômetro para e o jogo aparece como encerrado. Dá para reabrir depois.</p>
          <Button
            variant="primary"
            className="!min-h-14"
            onClick={() => {
              dispatch({ kind: "set_status", status: "finished", at: new Date().toISOString() });
              setDialog(null);
            }}
          >
            Encerrar
          </Button>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancelar
          </Button>
        </Sheet>
      )}
      {notice && <Toast message={notice} onClose={clearNotice} />}
    </div>
  );
}
