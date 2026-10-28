import type { Metadata } from "next";
import { NewMatchForm } from "@/components/NewMatchForm";

export const metadata: Metadata = { title: "Novo jogo" };

export default function NovoJogo() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-8">
      <header className="flex flex-col gap-1.5">
        <span className="label">Passo 1 de 2</span>
        <h1 className="text-3xl font-bold md:text-4xl">Novo jogo</h1>
        <p className="soft">Quem joga, onde e quem apita. Depois você cadastra a escalação.</p>
      </header>
      <NewMatchForm />
    </main>
  );
}
