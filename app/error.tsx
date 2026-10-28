"use client";

import { Button } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="soft">Não foi possível carregar esta tela. Suas anotações já enviadas estão salvas.</p>
      <Button variant="primary" onClick={reset}>
        Tentar de novo
      </Button>
    </main>
  );
}
