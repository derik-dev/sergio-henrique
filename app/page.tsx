"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Recent = { id: string; title: string };
const KEY = "recent-matches";

export default function Home() {
  const router = useRouter();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [referees, setReferees] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {}
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("matches")
      .insert({ home_name: home.trim(), away_name: away.trim(), referees: referees.trim() })
      .select("id")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Erro ao criar o jogo");
      setBusy(false);
      return;
    }
    try {
      const next = [{ id: data.id, title: `${home.trim()} x ${away.trim()}` }, ...recent].slice(0, 10);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    router.push(`/jogo/${data.id}/escalacao`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6 flex flex-col gap-8">
      <h1 className="text-4xl font-extrabold">Novo jogo</h1>
      <form onSubmit={create} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          Time da casa
          <input required value={home} onChange={(e) => setHome(e.target.value)} placeholder="Ex.: Flamengo" />
        </label>
        <label className="flex flex-col gap-2">
          Time visitante
          <input required value={away} onChange={(e) => setAway(e.target.value)} placeholder="Ex.: Vasco" />
        </label>
        <label className="flex flex-col gap-2">
          Árbitros
          <input value={referees} onChange={(e) => setReferees(e.target.value)} placeholder="Árbitro, auxiliares, VAR…" />
        </label>
        {error && <p className="text-red-400">{error}</p>}
        <button className="btn btn-primary text-2xl min-h-16" disabled={busy}>
          {busy ? "Criando…" : "Criar jogo e cadastrar escalação"}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">Jogos recentes (neste aparelho)</h2>
          {recent.map((r) => (
            <Link key={r.id} href={`/jogo/${r.id}`} className="btn flex items-center">
              {r.title}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
