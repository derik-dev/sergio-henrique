import type { PlayerView } from "@/lib/types";

// Posições simples em 4-4-2 (ataque para a direita). Índice = ordem do titular na lista.
const X = [0.075, 0.29, 0.54, 0.8];
const SPREAD = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
const SLOTS: [number, number][] = [
  [X[0], 0.5],
  ...SPREAD(4).map((y): [number, number] => [X[1], y]),
  ...SPREAD(4).map((y): [number, number] => [X[2], y]),
  ...SPREAD(2).map((y): [number, number] => [X[3], y]),
];

const W = 320;
const H = 190;

/** Mini-campo: cada titular cadastrado ocupa o próximo ponto da formação. */
export function MiniPitch({ starters, label }: { starters: PlayerView[]; label: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full rounded-card border border-line bg-[#0a1210]">
      <g fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.2">
        <rect x="8" y="8" width={W - 16} height={H - 16} rx="6" />
        <path d={`M${W / 2} 8v${H - 16}`} />
        <circle cx={W / 2} cy={H / 2} r="22" />
        <rect x="8" y={H / 2 - 40} width="38" height="80" />
        <rect x={W - 46} y={H / 2 - 40} width="38" height="80" />
        <rect x="8" y={H / 2 - 20} width="14" height="40" />
        <rect x={W - 22} y={H / 2 - 20} width="14" height="40" />
      </g>
      {SLOTS.map(([fx, fy], i) => {
        const p = starters[i];
        const cx = 8 + fx * (W - 16);
        const cy = 8 + fy * (H - 16);
        return p ? (
          <g key={p.id} transform={`translate(${cx} ${cy})`} className="row-in">
            <circle r="12" fill="#3ddc97" />
            <text textAnchor="middle" y="4.5" fontSize="12" fontWeight="800" fill="#04140c" style={{ fontVariantNumeric: "tabular-nums" }}>
              {p.shirt_number}
            </text>
          </g>
        ) : (
          <circle key={i} cx={cx} cy={cy} r="11" fill="none" stroke="rgba(255,255,255,.22)" strokeDasharray="3 3" />
        );
      })}
    </svg>
  );
}
