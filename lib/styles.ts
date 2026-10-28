// Estilos de botão compartilhados (módulo neutro: pode ser usado em Server e Client Components).
export type Variant = "default" | "primary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-btn border text-[16px] font-semibold " +
  "transition-[transform,background-color,border-color,box-shadow,filter,opacity] duration-150 ease-out " +
  "active:scale-[0.97] select-none disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  default: "border-line-strong bg-s3 text-ink hover:border-white/25 hover:bg-[#1f272d] active:bg-[#242d34] disabled:opacity-40",
  primary:
    "border-transparent bg-accent text-accent-ink shadow-[0_0_0_1px_rgba(61,220,151,.55),0_10px_28px_-10px_rgba(61,220,151,.55)] " +
    "hover:brightness-110 active:brightness-95 disabled:opacity-40",
  danger: "border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/15 hover:border-red-400/50 active:bg-red-500/25 disabled:opacity-40",
  ghost: "border-transparent bg-transparent text-muted hover:bg-white/[0.06] hover:text-ink active:bg-white/10 disabled:opacity-40",
};

export const gradientGreen =
  "border-transparent bg-gradient-to-b from-[#58eaaa] to-[#2dbd7f] text-accent-ink font-bold " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_0_0_1px_rgba(61,220,151,.5),0_10px_28px_-10px_rgba(61,220,151,.6)] " +
  "hover:brightness-110 active:brightness-95";

export function buttonClass(variant: Variant = "default", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}
