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
}: {
  player: PlayerView;
  replacedName?: string | null;
  tally: Tally;
  onOpen?: () => void;
  muted?: boolean;
  struck?: boolean;
}) {
  const icons = [
    tally.goal > 0 ? (tally.goal > 1 ? `⚽×${tally.goal}` : "⚽") : "",
    "🟨".repeat(tally.yellow),
    "🟥".repeat(tally.red),
  ].filter(Boolean);
  const label = `${player.shirt_number} ${player.name}${tally.goal ? `, ${tally.goal} gol(s)` : ""}${
    tally.yellow ? `, ${tally.yellow} amarelo(s)` : ""
  }${tally.red ? ", vermelho" : ""}`;

  const inner = (
    <>
      <span className={`player-num w-11 shrink-0 text-right text-2xl font-bold tabular-nums ${muted ? "text-white/40" : "text-white/60"}`}>
        {player.shirt_number}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`player-name block truncate text-[22px] font-semibold ${struck ? "text-white/45 line-through" : ""}`}>
          {player.name}
        </span>
        {replacedName && <span className="replaced-note block truncate text-sm text-white/45">↩ no lugar de {replacedName}</span>}
      </span>
      {icons.length > 0 && (
        <span className="player-icons flex shrink-0 items-center gap-1.5 text-2xl" aria-hidden="true">
          {icons.map((i, k) => (
            <span key={k}>{i}</span>
          ))}
        </span>
      )}
    </>
  );

  const cls =
    "player-row flex w-full items-center gap-3 min-h-[68px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-left";
  if (!onOpen) return <div className={cls}>{inner}</div>;
  return (
    <button
      type="button"
      data-player-id={player.id}
      aria-label={label}
      onClick={onOpen}
      className={`${cls} transition-[transform,background-color] duration-100 active:scale-[0.985] active:bg-white/15`}
    >
      {inner}
    </button>
  );
}
