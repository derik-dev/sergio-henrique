"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMatch } from "@/app/actions";
import { Button, Card, FloatingField, TeamCrest } from "./ui";

export function NewMatchForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [v, setV] = useState({ home_name: "", away_name: "", competition: "", referee: "", assistants: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const home = v.home_name.trim();
  const away = v.away_name.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
      <Card className="p-5 md:p-7">
        <form
          className="flex flex-col gap-4"
          action={() => {
            setError("");
            start(async () => {
              try {
                const res = await createMatch(v);
                if (!res.ok) return setError(res.error);
                router.push(`/jogos/${res.data.id}/escalacao`);
              } catch {
                setError("Sem conexão com o servidor. Tente de novo.");
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingField id="home_name" name="home_name" label="Time da casa" required value={v.home_name} onChange={set("home_name")} maxLength={80} autoComplete="off" />
            <FloatingField id="away_name" name="away_name" label="Time visitante" required value={v.away_name} onChange={set("away_name")} maxLength={80} autoComplete="off" />
          </div>
          <FloatingField id="competition" name="competition" label="Competição" optional value={v.competition} onChange={set("competition")} maxLength={120} autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingField id="referee" name="referee" label="Árbitro" optional value={v.referee} onChange={set("referee")} maxLength={120} autoComplete="off" />
            <FloatingField id="assistants" name="assistants" label="Assistentes" optional value={v.assistants} onChange={set("assistants")} maxLength={200} autoComplete="off" />
          </div>
          {error && (
            <p role="alert" className="rounded-btn border border-red-400/40 bg-red-500/10 p-3 text-red-200">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending || !home || !away} className="!min-h-14 !text-lg">
            {pending ? "Criando…" : "Criar e cadastrar escalação →"}
          </Button>
        </form>
      </Card>

      <aside aria-label="Prévia do confronto" className="lg:sticky lg:top-[88px]">
        <Card className="relative overflow-hidden p-6">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(closest-side,rgba(61,220,151,0.12),transparent)]" />
          <p className="label relative mb-5 text-center">Prévia do confronto</p>
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 flex-col items-center gap-3 text-center">
              <TeamCrest name={home || "Casa"} size={72} />
              <p className={`line-clamp-2 break-words text-lg font-bold leading-tight ${home ? "" : "text-faint"}`}>{home || "Time da casa"}</p>
            </div>
            <span className="text-2xl font-bold text-faint">x</span>
            <div className="flex min-w-0 flex-col items-center gap-3 text-center">
              <TeamCrest name={away || "Visitante"} size={72} />
              <p className={`line-clamp-2 break-words text-lg font-bold leading-tight ${away ? "" : "text-faint"}`}>{away || "Time visitante"}</p>
            </div>
          </div>
          <div className="relative mt-6 flex flex-col gap-1 border-t border-line pt-4 text-center text-[15px]">
            <p className={v.competition.trim() ? "font-semibold" : "text-faint"}>{v.competition.trim() || "Competição"}</p>
            <p className="soft">
              {[v.referee.trim(), v.assistants.trim()].filter(Boolean).join(" · ") || "Arbitragem"}
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
