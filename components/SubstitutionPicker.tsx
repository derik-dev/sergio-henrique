"use client";

import { Button, EmptyState } from "./ui";
import type { PlayerView } from "@/lib/types";

export function SubstitutionPicker({
  out,
  bench,
  onPick,
  onBack,
}: {
  out: PlayerView;
  bench: PlayerView[];
  onPick: (inId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="soft">
        Sai <strong className="text-white">{out.shirt_number} {out.name}</strong>. Quem entra?
      </p>
      {bench.length === 0 && <EmptyState>Sem reservas disponíveis.</EmptyState>}
      {bench.map((p) => (
        <Button key={p.id} onClick={() => onPick(p.id)} className="!justify-start gap-4 !text-xl">
          <span className="w-10 text-right tabular-nums soft">{p.shirt_number}</span>
          {p.name}
        </Button>
      ))}
      <Button variant="ghost" onClick={onBack}>
        Voltar
      </Button>
    </div>
  );
}
