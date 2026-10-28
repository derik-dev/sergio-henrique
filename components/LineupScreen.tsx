"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LineupForm } from "./LineupForm";
import { LineupImport } from "./LineupImport";
import { Button, SyncBadge, Tabs, Toast } from "./ui";
import { useMatchStore } from "@/lib/use-match-store";
import type { MatchState, Side } from "@/lib/types";

export function LineupScreen({ initial }: { initial: MatchState }) {
  const router = useRouter();
  const { state, dispatch, flush, sync, pending, notice, clearNotice } = useMatchStore(initial);
  const [tab, setTab] = useState<Side>("home");
  const [importing, setImporting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const { match, players } = state;

  const sides: { side: Side; name: string }[] = [
    { side: "home", name: match.home_name },
    { side: "away", name: match.away_name },
  ];
  const hasStarters = players.some((p) => p.is_starter && p.status !== "removed");

  async function start() {
    setStarting(true);
    dispatch({ kind: "set_status", status: "live", at: new Date().toISOString() });
    const ok = await flush();
    if (!ok) {
      setStarting(false);
      return setLocalNotice("Sem conexão: não foi possível salvar ainda. Suas alterações ficam na fila e sincronizam sozinhas.");
    }
    router.push(`/jogos/${match.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-32 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="soft inline-flex min-h-11 items-center">
            ← Jogos
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">Escalação</h1>
          <p className="soft">
            {match.home_name} x {match.away_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncBadge status={sync} pending={pending} />
          <Button onClick={() => setImporting(true)}>✨ Colar escalação</Button>
        </div>
      </header>

      <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />

      <div className="grid gap-8 md:grid-cols-2">
        {sides.map(({ side, name }) => (
          <section key={side} className={tab === side ? "block" : "hidden md:block"} aria-label={name}>
            <h2 className="mb-4 hidden border-b border-white/15 pb-2 text-2xl font-bold md:block">{name}</h2>
            <LineupForm
              players={players.filter((p) => p.side === side)}
              onAdd={(n, shirt, isStarter) =>
                dispatch({ kind: "add_player", id: crypto.randomUUID(), side, name: n, shirt_number: shirt, is_starter: isStarter })
              }
              onUpdate={(id, n, shirt) => dispatch({ kind: "update_player", id, name: n, shirt_number: shirt })}
              onRemove={(id) => dispatch({ kind: "remove_player", id })}
            />
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <Button variant="primary" className="w-full !min-h-14 !text-xl" disabled={!hasStarters || starting} onClick={start}>
            {starting ? "Salvando…" : "Começar jogo →"}
          </Button>
        </div>
      </div>

      {importing && <LineupImport matchId={match.id} existing={players} dispatch={dispatch} onClose={() => setImporting(false)} />}
      {(notice || localNotice) && (
        <Toast
          message={(notice ?? localNotice)!}
          onClose={() => {
            clearNotice();
            setLocalNotice(null);
          }}
        />
      )}
    </main>
  );
}
