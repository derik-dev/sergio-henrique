"use client";

import { Button, EmptyState, ShirtBadge } from "./ui";
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
        Sai <strong className="text-ink">{out.shirt_number} {out.name}</strong>. Quem entra?
      </p>
      {bench.length === 0 && <EmptyState compact title="Sem reservas">Cadastre reservas na escalação para fazer substituições.</EmptyState>}
      {bench.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-s2 px-3 text-left text-[18px] font-semibold transition-[transform,background-color,border-color] duration-150 hover:border-accent/40 hover:bg-s3 active:scale-[0.985]"
        >
          <ShirtBadge number={p.shirt_number} />
          {p.name}
        </button>
      ))}
      <Button variant="ghost" onClick={onBack}>
        Voltar
      </Button>
    </div>
  );
}
