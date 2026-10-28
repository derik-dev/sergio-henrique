import Link from "next/link";
import { NewMatchForm } from "@/components/NewMatchForm";

export default function NovoJogo() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <header>
        <Link href="/" className="soft inline-flex min-h-11 items-center">
          ← Jogos
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Novo jogo</h1>
      </header>
      <NewMatchForm />
    </main>
  );
}
