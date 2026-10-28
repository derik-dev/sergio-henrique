"use client";

import { useRef, useState } from "react";
import { Button, EmptyState } from "./ui";
import type { PlayerView } from "@/lib/types";

export function AddPlayerForm({
  starterCount,
  onAdd,
  autoFocus,
}: {
  starterCount: number;
  onAdd: (name: string, shirt: number, isStarter: boolean) => void;
  autoFocus?: boolean;
}) {
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [starter, setStarter] = useState(starterCount < 11);
  const numRef = useRef<HTMLInputElement>(null);
  const valid = name.trim().length > 0 && num !== "" && Number(num) >= 0 && Number(num) <= 99;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd(name.trim(), Number(num), starter);
        setNum("");
        setName("");
        numRef.current?.focus();
      }}
    >
      <div className="flex gap-2">
        <input
          ref={numRef}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={num}
          onChange={(e) => setNum(e.target.value)}
          placeholder="Nº"
          aria-label="Número da camisa"
          className="!w-24 shrink-0"
          autoFocus={autoFocus}
        />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" aria-label="Nome do jogador" maxLength={80} />
      </div>
      <div className="flex gap-2">
        <div role="group" aria-label="Função" className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={starter === v}
              onClick={() => setStarter(v)}
              className={`min-h-11 rounded-lg text-base font-semibold transition-colors duration-100 active:scale-[0.97] ${
                starter === v ? "bg-white text-black" : "text-white/70"
              }`}
            >
              {v ? "Titular" : "Reserva"}
            </button>
          ))}
        </div>
        <Button type="submit" variant="primary" disabled={!valid}>
          Adicionar
        </Button>
      </div>
    </form>
  );
}

function EditableRow({
  player,
  onUpdate,
  onRemove,
}: {
  player: PlayerView;
  onUpdate: (id: string, name: string, shirt: number) => void;
  onRemove: (id: string) => void;
}) {
  const commit = (num: string, name: string) => {
    const n = Number(num);
    if (!name.trim() || num === "" || !Number.isInteger(n) || n < 0 || n > 99) return;
    if (name.trim() !== player.name || n !== player.shirt_number) onUpdate(player.id, name.trim(), n);
  };
  return (
    <li
      className="flex items-center gap-2"
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        const [n, nm] = Array.from(e.currentTarget.querySelectorAll("input")).map((i) => i.value);
        commit(n, nm);
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        defaultValue={player.shirt_number}
        aria-label={`Número de ${player.name}`}
        className="!w-20 shrink-0 text-center font-bold"
      />
      <input defaultValue={player.name} aria-label="Nome" maxLength={80} />
      <Button variant="danger" onClick={() => onRemove(player.id)} aria-label={`Remover ${player.name}`} className="!min-w-12 !px-0">
        ✕
      </Button>
    </li>
  );
}

export function LineupForm({
  players,
  onAdd,
  onUpdate,
  onRemove,
}: {
  players: PlayerView[];
  onAdd: (name: string, shirt: number, isStarter: boolean) => void;
  onUpdate: (id: string, name: string, shirt: number) => void;
  onRemove: (id: string) => void;
}) {
  const visible = players.filter((p) => p.status !== "removed");
  const starters = visible.filter((p) => p.is_starter).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  const bench = visible.filter((p) => !p.is_starter);

  const group = (title: string, list: PlayerView[], hint?: string) => (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-baseline justify-between">
        <span className="label">{title}</span>
        {hint && <span className={`text-sm ${list.length === 11 ? "text-accent" : "soft"}`}>{hint}</span>}
      </h3>
      {list.length === 0 ? (
        <EmptyState>Nenhum jogador ainda.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => (
            <EditableRow key={`${p.id}-${p.name}-${p.shirt_number}`} player={p} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {group("Titulares", starters, `${starters.length}/11`)}
      {group("Reservas", bench, `${bench.length}`)}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <AddPlayerForm starterCount={starters.length} onAdd={onAdd} />
      </div>
    </div>
  );
}
