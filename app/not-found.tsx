import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-16">
      <EmptyState
        title="Jogo não encontrado"
        action={
          <LinkButton href="/" variant="primary">
            Ver jogos
          </LinkButton>
        }
      >
        Confira o link: ele precisa estar completo.
      </EmptyState>
    </main>
  );
}
