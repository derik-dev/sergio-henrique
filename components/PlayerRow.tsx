import { ShirtBadge } from "./ui";
import type { PlayerView } from "@/lib/types";

export interface Tally {
  goal: number;
  yellow: number;
  red: number;
}

export function PlayerRow({
  player,
  replacedName,
  tally,
  onOpen,
  muted,
  struck,
  selected,
}: {
  player: PlayerView;
  replacedName?: string | null;
  tally: Tally;
  onOpen?: () => void;
  muted?: boolean;
  struck?: boolean;
  selected?: boolean;
}) {
  const label = `${player.shirt_number} ${player.name}${tally.goal ? `, ${tally.goal} gol(s)` : ""}${
    tally.yellow ? `, ${tally.yellow} amarelo(s)` : ""
  }${tally.red ? ", vermelho" : ""}`;

  const inner = (
    <>
      <ShirtBadge number={player.shirt_number} muted={muted} />
      <span className="min-w-0 flex-1">
        <span
          className={`player-name block truncate text-[19px] font-semibold leading-tight ${
            struck ? "text-faint line-through decoration-white/40" : muted ? "text-muted" : ""
          }`}
        >
          {player.name}
        </span>
        {replacedName && <span className="replaced-note block truncate text-[13px] text-faint">↩ no lugar de {replacedName}</span>}
      </span>
      {(tally.goal > 0 || tally.yellow > 0 || tally.red > 0) && (
        <span className="player-icons flex shrink-0 items-center gap-1.5" aria-hidden="true">
          {tally.goal > 0 && (
            <span key={`g${tally.goal}`} className="icon-pop flex items-center gap-0.5 text-xl font-bold">
              ⚽{tally.goal > 1 && <span className="tnum text-[15px]">×{tally.goal}</span>}
            </span>
          )}
          {Array.from({ length: tally.yellow }, (_, i) => (
            <span key={`y${i}`} className="card-icon bg-card-yellow" />
          ))}
          {Array.from({ length: tally.red }, (_, i) => (
            <span key={`r${i}`} className="card-icon bg-card-red" />
          ))}
        </span>
      )}
    </>
  );

  const cls = `player-row row-in flex w-full items-center gap-3.5 min-h-[60px] rounded-card border px-3 py-2 text-left ${
    selected ? "border-accent/60 bg-accent-soft" : "border-line bg-s2"
  }`;
  if (!onOpen) return <div className={cls}>{inner}</div>;
  return (
    <button
      type="button"
      data-player-id={player.id}
      aria-label={label}
      onClick={onOpen}
      className={`${cls} transition-[transform,background-color,border-color] duration-150 ease-out hover:border-line-strong hover:bg-s3 active:scale-[0.985] active:bg-[#1f272d]`}
    >
      {inner}
    </button>
  );
}
