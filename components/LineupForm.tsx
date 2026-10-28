"use client";

import { useRef, useState } from "react";
import { Button, EmptyState } from "./ui";
import type { PlayerView } from "@/lib/types";

/** Linha compacta: número, nome, titular/reserva e adicionar. Enter adiciona e volta o foco para o número. */
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
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd(name.trim(), Number(num), starter);
        setNum("");
        setName("");
        numRef.current?.focus();
      }}
    >
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
        className="tnum !w-[72px] shrink-0 !px-2 text-center !text-lg !font-bold"
        autoFocus={autoFocus}
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do jogador"
        aria-label="Nome do jogador"
        maxLength={80}
        className="!w-auto min-w-[140px] flex-1"
      />
      <div role="group" aria-label="Função" className="flex shrink-0 gap-1 rounded-btn border border-line bg-s2 p-1">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={starter === v}
            onClick={() => setStarter(v)}
            className={`min-h-10 rounded-[7px] px-3 text-[15px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
              starter === v ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {v ? "Titular" : "Reserva"}
          </button>
        ))}
      </div>
      <Button type="submit" variant="primary" disabled={!valid} aria-label="Adicionar jogador" className="!px-6">
        + Adicionar
      </Button>
    </form>
  );
}

function ShirtInput({ player }: { player: PlayerView }) {
  return (
    <span className="shirt relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <path
          d="M17 5 6 11l4 11 5-2v22h18V20l5 2 4-11L31 5c-1 3-4 4-7 4s-6-1-7-4Z"
          fill="#181e23"
          stroke="rgba(255,255,255,.2)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <input
        type="number"
        inputMode="numeric"
        defaultValue={player.shirt_number}
        aria-label={`Número de ${player.name}`}
        className="tnum absolute inset-0 !min-h-0 !w-full !border-transparent !bg-transparent !p-0 pt-[3px] text-center !text-[17px] font-extrabold hover:!border-transparent focus:!shadow-none"
      />
    </span>
  );
}

function EditableRow({
  player,
  discreet,
  onUpdate,
  onRemove,
}: {
  player: PlayerView;
  discreet?: boolean;
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
      className={`row-in flex items-center gap-2 rounded-card border p-1 pr-1 transition-colors duration-150 hover:border-line-strong ${
        discreet ? "border-transparent bg-transparent hover:bg-s2" : "border-line bg-s2"
      }`}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        const [n, nm] = Array.from(e.currentTarget.querySelectorAll("input")).map((i) => i.value);
        commit(n, nm);
      }}
    >
      <ShirtInput player={player} />
      <input
        defaultValue={player.name}
        aria-label="Nome"
        maxLength={80}
        className="!border-transparent !bg-transparent text-[18px] font-semibold hover:!border-transparent focus:!bg-s3"
      />
      <Button variant="ghost" onClick={() => onRemove(player.id)} aria-label={`Remover ${player.name}`} className="!min-w-12 !px-0 text-faint hover:!text-red-300">
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="flex items-baseline justify-between">
          <span className="label">Titulares</span>
          <span className={`tnum text-sm font-semibold ${starters.length === 11 ? "text-accent" : "text-faint"}`}>{starters.length}/11</span>
        </h3>
        {starters.length === 0 ? (
          <EmptyState compact title="Nenhum titular">
            Digite o número e o nome abaixo e aperte Enter.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {starters.map((p) => (
              <EditableRow key={`${p.id}-${p.name}-${p.shirt_number}`} player={p} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border border-line bg-white/[0.015] p-3">
        <AddPlayerForm starterCount={starters.length} onAdd={onAdd} />
      </div>

      <div className="flex flex-col gap-1.5 rounded-card border border-line bg-white/[0.015] p-3">
        <h3 className="flex items-baseline justify-between">
          <span className="label">Reservas</span>
          <span className="tnum text-sm font-semibold text-faint">{bench.length}</span>
        </h3>
        {bench.length === 0 ? (
          <p className="soft py-2 text-[15px]">Nenhum reserva ainda. Escolha “Reserva” ao adicionar.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {bench.map((p) => (
              <EditableRow key={`${p.id}-${p.name}-${p.shirt_number}`} player={p} discreet onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
