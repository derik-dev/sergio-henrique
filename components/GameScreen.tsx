"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddPlayerForm } from "./LineupForm";
import { PlayerMenu, type MenuView } from "./PlayerMenu";
import { PlayerRow } from "./PlayerRow";
import { Scoreboard } from "./Scoreboard";
import { ShareSheet } from "./ShareSheet";
import { SummarySheet } from "./SummarySheet";
import { Timeline } from "./Timeline";
import { Button, Card, EmptyState, LinkButton, Sheet, Tabs, TeamCrest, Toast } from "./ui";
import { activeEvents, currentMinute, describeEvent, lastUndoable, playersOf, tally, teamName } from "@/lib/game-logic";
import { useWakeLock } from "@/lib/hooks";
import { usePublishSync } from "@/lib/sync-bus";
import { useMatchStore } from "@/lib/use-match-store";
import type { MatchState, PlayerView, Side } from "@/lib/types";

type Dialog = null | { kind: "summary" | "share" | "finish" } | { kind: "add"; side: Side };

const BROADCAST_KEY = "broadcast-mode";

export function GameScreen({ initial }: { initial: MatchState }) {
  const { state, dispatch, sync, pending, notice, clearNotice } = useMatchStore(initial);
  usePublishSync(sync, pending);
  useWakeLock();

  const [tab, setTab] = useState<Side>("home");
  const [menu, setMenu] = useState<{ id: string; view: MenuView } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [broadcast, setBroadcast] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

  const sides: { side: Side; name: string; role: string }[] = [
    { side: "home", name: match.home_name, role: "Casa" },
    { side: "away", name: match.away_name, role: "Visitante" },
  ];
  const openMenu = (p: PlayerView) => setMenu({ id: p.id, view: "menu" });
  const finished = match.status === "finished";

  return (
    <div data-broadcast={broadcast}>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pb-40 pt-5">
        <Scoreboard
          state={state}
          onClock={(action, seconds) => dispatch({ kind: "clock", action, at: new Date().toISOString(), seconds })}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hide-in-broadcast soft min-w-0 flex-1 basis-60 text-[15px]">
            {match.competition && <span className="font-semibold text-ink">{match.competition} · </span>}
            Arbitragem: {[match.referee, match.assistants].filter(Boolean).join(" · ") || "não informada"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={`/jogos/${match.id}/escalacao`} className="hide-in-broadcast !min-h-12">
              Escalação
            </LinkButton>
            <Button className="hide-in-broadcast" onClick={() => setDialog({ kind: "share" })}>
              🔗 Link ao vivo
            </Button>
            <Button className="hide-in-broadcast" onClick={() => setDialog({ kind: "summary" })}>
              📝 Resumo
            </Button>
            <Button variant={broadcast ? "primary" : "default"} aria-pressed={broadcast} onClick={toggleBroadcast}>
              📡 Transmissão
            </Button>
          </div>
        </div>

        <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="grid min-w-0 flex-1 gap-5 md:grid-cols-2">
            {sides.map(({ side, name, role }) => {
              const { field, bench, out } = playersOf(state, side);
              return (
                <section key={side} className={tab === side ? "block" : "hidden md:block"} aria-label={name}>
                  <Card className="flex flex-col gap-2 p-3 md:p-4">
                    <div className="mb-1 flex items-center gap-3 border-b border-line pb-3">
                      <TeamCrest name={name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="label">{role}</p>
                        <h2 className="truncate text-xl font-bold">{name}</h2>
                      </div>
                      <span className="tnum text-sm font-semibold text-faint">{field.length} em campo</span>
                    </div>

                    {field.length === 0 && (
                      <EmptyState
                        compact
                        title="Sem titulares"
                        action={
                          <LinkButton href={`/jogos/${match.id}/escalacao`} variant="primary">
                            Cadastrar escalação
                          </LinkButton>
                        }
                      >
                        Cadastre os jogadores para começar a anotar.
                      </EmptyState>
                    )}
                    {field.map((p) => (
                      <PlayerRow
                        key={p.id}
                        player={p}
                        selected={menu?.id === p.id}
                        replacedName={p.replaced_player_id ? byId.get(p.replaced_player_id)?.name : null}
                        tally={tally(active, p.id)}
                        onOpen={() => openMenu(p)}
                      />
                    ))}

                    {out.length > 0 && (
                      <div className="hide-in-broadcast mt-3 flex flex-col gap-1.5">
                        <span className="label">Substituídos</span>
                        {out.map((p) => (
                          <PlayerRow key={p.id} player={p} struck muted tally={tally(active, p.id)} onOpen={() => openMenu(p)} />
                        ))}
                      </div>
                    )}
                    {bench.length > 0 && (
                      <div className="hide-in-broadcast mt-3 flex flex-col gap-1.5">
                        <span className="label">Reservas</span>
                        {bench.map((p) => (
                          <PlayerRow key={p.id} player={p} muted tally={tally(active, p.id)} onOpen={() => openMenu(p)} />
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" className="hide-in-broadcast mt-2 !justify-start" onClick={() => setDialog({ kind: "add", side })}>
                      + Adicionar jogador
                    </Button>
                  </Card>
                </section>
              );
            })}
          </div>

          <Timeline state={state} />
        </div>

        <div className="hide-in-broadcast flex justify-center pt-2">
          {finished ? (
            <Button
              onClick={() => dispatch({ kind: "set_status", status: "live", at: new Date().toISOString() })}
            >
              Reabrir jogo
            </Button>
          ) : match.status === "live" ? (
            <Button variant="danger" onClick={() => setDialog({ kind: "finish" })}>
              Encerrar jogo
            </Button>
          ) : null}
        </div>
      </main>

      {/* Barra fixa: desfazer sempre à mão */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <Button variant="danger" className="!min-h-14 shrink-0 !text-[17px]" disabled={!last} onClick={undo}>
            ↩ Desfazer último evento{" "}
            <kbd className="hidden rounded border border-red-300/40 px-1.5 text-xs lg:inline">Z</kbd>
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
          <p className="soft">O cronômetro para e o jogo aparece como encerrado. Dá para reabrir depois.</p>
          <Button
            variant="primary"
            className="!min-h-14"
            onClick={() => {
              dispatch({ kind: "set_status", status: "finished", at: new Date().toISOString() });
              setDialog(null);
              setSuccess("Jogo encerrado.");
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
      {success && !notice && <Toast tone="success" message={success} onClose={() => setSuccess(null)} />}
    </div>
  );
}
