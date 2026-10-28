import { Suspense } from "react";
import Link from "next/link";
import { LinkButton, EmptyState } from "@/components/ui";
import { listMatches, type MatchSummary } from "@/lib/data";

const STATUS: Record<MatchSummary["status"], string> = { lineup: "Escalação", live: "Ao vivo", finished: "Encerrado" };

async function MatchList() {
  let matches: MatchSummary[];
  try {
    matches = await listMatches();
  } catch {
    return (
      <p role="alert" className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200">
        Não foi possível carregar os jogos. Verifique a conexão e o .env.local, e recarregue.
      </p>
    );
  }
  if (matches.length === 0) return <EmptyState>Nenhum jogo ainda. Crie o primeiro no botão acima.</EmptyState>;
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            href={m.status === "lineup" ? `/jogos/${m.id}/escalacao` : `/jogos/${m.id}`}
            className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 transition-[transform,background-color] duration-100 active:scale-[0.985] active:bg-white/15"
          >
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold">
                {m.home_name} x {m.away_name}
              </span>
              <span className="soft block truncate text-base">
                {[m.competition, new Date(m.created_at).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${
                m.status === "live" ? "border-accent text-accent" : "border-white/20 text-white/60"
              }`}
            >
              {STATUS[m.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Jogos</h1>
        <LinkButton href="/jogos/novo" variant="primary" className="!min-h-16 !text-2xl">
          + Novo jogo
        </LinkButton>
      </header>
      <Suspense fallback={<p className="soft">Carregando jogos…</p>}>
        <MatchList />
      </Suspense>
    </main>
  );
}
