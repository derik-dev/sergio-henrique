"use client";

import { Button, EmptyState } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-16">
      <EmptyState
        title="Algo deu errado"
        action={
          <Button variant="primary" onClick={reset}>
            Tentar de novo
          </Button>
        }
      >
        Não foi possível carregar esta tela. Suas anotações já enviadas estão salvas.
      </EmptyState>
    </main>
  );
}
