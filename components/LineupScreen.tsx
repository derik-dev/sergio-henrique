"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineupForm } from "./LineupForm";
import { LineupImport } from "./LineupImport";
import { MiniPitch } from "./MiniPitch";
import { Badge, Button, Card, GradientButton, Tabs, TeamCrest, Toast } from "./ui";
import { usePublishSync } from "@/lib/sync-bus";
import { useMatchStore } from "@/lib/use-match-store";
import type { MatchState, Side } from "@/lib/types";

export function LineupScreen({ initial }: { initial: MatchState }) {
  const router = useRouter();
  const { state, dispatch, flush, sync, pending, notice, clearNotice } = useMatchStore(initial);
  usePublishSync(sync, pending);
  const [tab, setTab] = useState<Side>("home");
  const [importing, setImporting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { match, players } = state;

  const sides: { side: Side; name: string; role: string }[] = [
    { side: "home", name: match.home_name, role: "Casa" },
    { side: "away", name: match.away_name, role: "Visitante" },
  ];
  const starterCount = (side: Side) => players.filter((p) => p.side === side && p.is_starter && p.status !== "removed").length;
  const homeMissing = Math.max(0, 11 - starterCount("home"));
  const awayMissing = Math.max(0, 11 - starterCount("away"));
  const ready = homeMissing === 0 && awayMissing === 0;

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

  const hint = ready
    ? "Tudo certo. Boa transmissão!"
    : [homeMissing > 0 && `${match.home_name}: faltam ${homeMissing}`, awayMissing > 0 && `${match.away_name}: faltam ${awayMissing}`]
        .filter(Boolean)
        .join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-40 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label">Passo 2 de 2</span>
          <h1 className="text-3xl font-bold md:text-4xl">Escalação</h1>
          <p className="soft flex items-center gap-2">
            <TeamCrest name={match.home_name} size={22} /> {match.home_name} <span className="text-faint">x</span>
            <TeamCrest name={match.away_name} size={22} /> {match.away_name}
          </p>
        </div>
        <GradientButton onClick={() => setImporting(true)}>✨ Colar escalação com IA</GradientButton>
      </header>

      <Tabs value={tab} onChange={setTab} items={sides.map((s) => ({ value: s.side, label: s.name }))} />

      <div className="grid gap-6 md:grid-cols-2">
        {sides.map(({ side, name, role }) => {
          const mine = players.filter((p) => p.side === side);
          const starters = mine
            .filter((p) => p.is_starter && p.status !== "removed")
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
          return (
            <section key={side} className={tab === side ? "block" : "hidden md:block"} aria-label={name}>
              <Card className="flex flex-col gap-5 p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <TeamCrest name={name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="label">{role}</p>
                    <h2 className="truncate text-2xl font-bold">{name}</h2>
                  </div>
                  <Badge tone={starters.length === 11 ? "live" : "neutral"}>
                    <span className="tnum">{starters.length}/11</span>
                  </Badge>
                </div>
                <MiniPitch starters={starters} label={`Mini-campo com ${starters.length} titulares de ${name}`} />
                <LineupForm
                  players={mine}
                  onAdd={(n, shirt, isStarter) =>
                    dispatch({ kind: "add_player", id: crypto.randomUUID(), side, name: n, shirt_number: shirt, is_starter: isStarter })
                  }
                  onUpdate={(id, n, shirt) => dispatch({ kind: "update_player", id, name: n, shirt_number: shirt })}
                  onRemove={(id) => dispatch({ kind: "remove_player", id })}
                />
              </Card>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-[15px] ${ready ? "text-accent" : "soft"}`}>{hint}</p>
          <Button
            variant={ready ? "primary" : "default"}
            disabled={!ready || starting}
            onClick={start}
            className={`!min-h-14 sm:min-w-[260px] !text-lg ${
              ready ? "" : "!border-dashed !border-line-strong !bg-transparent !text-faint !opacity-100"
            }`}
          >
            {starting ? "Salvando…" : ready ? "Começar jogo →" : "🔒 Começar jogo"}
          </Button>
        </div>
      </div>

      {importing && (
        <LineupImport
          matchId={match.id}
          existing={players}
          dispatch={dispatch}
          onImported={(n) => setSuccess(`${n} jogadores adicionados à escalação.`)}
          onClose={() => setImporting(false)}
        />
      )}
      {(notice || localNotice) && (
        <Toast
          message={(notice ?? localNotice)!}
          onClose={() => {
            clearNotice();
            setLocalNotice(null);
          }}
        />
      )}
      {success && !notice && !localNotice && <Toast tone="success" message={success} onClose={() => setSuccess(null)} />}
    </main>
  );
}
