"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode } from "react";
import { buttonClass, gradientGreen, type Variant } from "@/lib/styles";
import type { SyncStatus } from "@/lib/use-match-store";

/* ───────── Button ───────── */
export { buttonClass, gradientGreen };

export function Button({
  variant = "default",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "default",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** Botão destacado com borda em gradiente verde (ação de IA). */
export function GradientButton({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`group rounded-btn bg-gradient-to-r from-accent via-accent/25 to-accent p-px transition-[transform,filter] duration-150 active:scale-[0.97] hover:brightness-125 ${className}`}
      {...props}
    >
      <span className="flex min-h-12 items-center justify-center gap-2 rounded-[9px] bg-s2 px-5 text-[16px] font-semibold text-ink">
        {children}
      </span>
    </button>
  );
}

/* ───────── Card / Badge ───────── */
export function Card({
  className = "",
  interactive,
  children,
}: {
  className?: string;
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-s1 shadow-card ${
        interactive
          ? "transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(61,220,151,0.25)] hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,.9)] active:translate-y-0 active:scale-[0.99]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "live" | "warn" | "danger";
const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-muted bg-white/[0.03]",
  live: "border-accent/40 text-accent bg-accent-soft",
  warn: "border-amber-300/40 text-amber-200 bg-amber-300/10",
  danger: "border-red-400/40 text-red-300 bg-red-500/10",
};

export function Badge({ tone = "neutral", pulse, children }: { tone?: Tone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {pulse && <span className="live-dot h-2 w-2 rounded-full bg-accent" />}
      {children}
    </span>
  );
}

/* ───────── Escudo genérico (iniciais + par de cores gerado pelo nome) ───────── */
function hash(name: string) {
  let h = 2166136261;
  for (const c of name.toLowerCase()) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const STOP = new Set(["de", "da", "do", "das", "dos", "e", "fc", "ec", "sc", "ac", "clube"]);
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function initials(name: string) {
  const words = plain(name).split(" ").map((w) => w.trim()).filter(Boolean);
  const sig = words.filter((w) => !STOP.has(w.toLowerCase()));
  const use = sig.length > 0 ? sig : words;
  if (use.length === 0) return "?";
  if (use.length === 1) return use[0].slice(0, 2).toUpperCase();
  return (use[0][0] + use[1][0]).toUpperCase();
}

const CREST_PALETTE: [string, string][] = [
  ["#e5484d", "#8a1c28"], // carmim
  ["#f07a2a", "#a63c0c"], // laranja
  ["#2fbf71", "#0f6a42"], // esmeralda
  ["#d9a10c", "#8a5a00"], // ouro
  ["#14b8a6", "#0a6a72"], // turquesa
  ["#6aa80f", "#2f6a05"], // lima
  ["#6366f1", "#312a8e"], // índigo
  ["#a855f7", "#5b21b6"], // violeta
  ["#e0409d", "#85205f"], // magenta
  ["#f4577a", "#9d1f3f"], // rosa
  ["#5b7fa6", "#26405f"], // azul-aço
  ["#38a3f5", "#1b4fa6"], // azul-céu
];

export function crestColors(name: string): [string, string] {
  return CREST_PALETTE[hash(name || "?") % CREST_PALETTE.length];
}

export function TeamCrest({ name, size = 44 }: { name: string; size?: number }) {
  const [a, b] = crestColors(name);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        textShadow: "0 1px 2px rgba(0,0,0,.35)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.3), 0 4px 12px -4px rgba(0,0,0,.7)",
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ───────── Camisa (número em destaque) ───────── */
export function ShirtBadge({ number, muted, className = "" }: { number: number | string; muted?: boolean; className?: string }) {
  return (
    <span className={`shirt relative inline-flex h-11 w-11 shrink-0 items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" fill="none">
        <path
          d="M17 5 6 11l4 11 5-2v22h18V20l5 2 4-11L31 5c-1 3-4 4-7 4s-6-1-7-4Z"
          fill={muted ? "#12171b" : "#181e23"}
          stroke={muted ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.2)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`tnum relative top-[2px] text-[17px] font-extrabold ${muted ? "text-faint" : "text-ink"}`}>{number}</span>
    </span>
  );
}

/* ───────── Estados vazios com ilustração ───────── */
export function PitchIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="10" y="10" width="200" height="120" rx="8" opacity=".5" />
      <path d="M110 10v120" opacity=".5" />
      <circle cx="110" cy="70" r="20" opacity=".5" />
      <rect x="10" y="42" width="30" height="56" opacity=".4" />
      <rect x="180" y="42" width="30" height="56" opacity=".4" />
      <rect x="10" y="56" width="12" height="28" opacity=".4" />
      <rect x="198" y="56" width="12" height="28" opacity=".4" />
      <circle cx="110" cy="70" r="2.5" fill="currentColor" stroke="none" className="text-accent" />
      <path d="M64 48l22 12M156 92l-24-12" strokeDasharray="3 4" className="text-accent" opacity=".9" />
      <circle cx="60" cy="46" r="5" className="text-accent" />
      <circle cx="160" cy="94" r="5" className="text-accent" />
    </svg>
  );
}

export function EmptyState({
  title,
  children,
  action,
  compact,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-white/[0.015] text-center ${
        compact ? "px-4 py-6" : "px-6 py-12"
      }`}
    >
      <PitchIllustration className={`${compact ? "w-28" : "w-48"} text-white/40`} />
      {title && <h3 className="text-xl font-bold">{title}</h3>}
      {children && <p className="soft max-w-sm">{children}</p>}
      {action}
    </div>
  );
}

/* ───────── Skeleton ───────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* ───────── Campo com rótulo flutuante ───────── */
export function FloatingField({
  label,
  optional,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; optional?: boolean }) {
  return (
    <div className="float-field">
      <input {...props} placeholder=" " />
      <label htmlFor={props.id}>
        {label}
        {optional && <span className="opacity-70"> · opcional</span>}
      </label>
    </div>
  );
}

/* ───────── Sheet (bottom sheet no celular, popover centralizado no tablet/PC) ───────── */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-[2px] md:items-center md:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`sheet-panel flex max-h-[88vh] w-full flex-col gap-4 overflow-y-auto rounded-t-[20px] border border-line-strong bg-s1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-pop outline-none md:rounded-[16px] ${
          wide ? "md:max-w-3xl" : "md:max-w-md"
        }`}
      >
        <div className="mx-auto -mt-1 h-1 w-10 rounded-full bg-white/15 md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-xl font-bold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Fechar" className="!min-w-12 !px-0">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── Toast ───────── */
export function Toast({ message, onClose, tone = "error" }: { message: string; onClose: () => void; tone?: "error" | "success" }) {
  useEffect(() => {
    const t = setTimeout(onClose, tone === "success" ? 3200 : 5500);
    return () => clearTimeout(t);
  }, [message, onClose, tone]);
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="toast-in fixed inset-x-4 top-[72px] z-50 mx-auto flex max-w-md items-center gap-3 rounded-card border border-line-strong bg-s2 py-2 pl-4 pr-2 shadow-pop"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone === "error" ? "bg-red-400" : "bg-accent"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[15px]">{message}</span>
      <Button variant="ghost" onClick={onClose} aria-label="Dispensar aviso" className="!min-h-12 !min-w-12 !px-0">
        ✕
      </Button>
    </div>
  );
}

/* ───────── Estado de conexão ───────── */
const SYNC_TEXT: Record<SyncStatus, string> = { online: "Online", offline: "Sem conexão", syncing: "Sincronizando…" };

export function SyncBadge({ status, pending }: { status: SyncStatus; pending: number }) {
  const dot = status === "online" ? "bg-accent" : status === "syncing" ? "bg-amber-300" : "bg-red-400";
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-3 text-sm font-semibold"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot} ${status === "syncing" ? "animate-pulse" : ""}`} />
      {SYNC_TEXT[status]}
      {pending > 0 && <span className="soft tnum">· {pending} na fila</span>}
    </span>
  );
}

/* ───────── Abas (celular) ───────── */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-card border border-line bg-s1 p-1 md:hidden">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`min-h-12 truncate rounded-[9px] px-3 text-[16px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
            value === it.value ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
