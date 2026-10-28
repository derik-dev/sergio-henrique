import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Jogo não encontrado</h1>
      <p className="soft">Confira o link. Ele precisa estar completo.</p>
      <LinkButton href="/" variant="primary">
        Ver jogos
      </LinkButton>
    </main>
  );
}
