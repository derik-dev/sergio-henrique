"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import type { SyncStatus } from "@/lib/use-match-store";

type Variant = "default" | "primary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl border text-[17px] font-semibold " +
  "transition-[transform,background-color,filter] duration-100 active:scale-[0.97] select-none " +
  "disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  default: "border-white/15 bg-white/[0.06] hover:bg-white/10 active:bg-white/20",
  primary: "border-transparent bg-accent text-black hover:brightness-110 active:brightness-90",
  danger: "border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/15 active:bg-red-500/25",
  ghost: "border-transparent bg-transparent text-white/70 hover:bg-white/10 active:bg-white/20",
};

export function buttonClass(variant: Variant = "default", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/75 md:items-center md:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[88vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-white/15 bg-neutral-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none md:rounded-3xl ${
          wide ? "md:max-w-3xl" : "md:max-w-md"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Fechar" className="!min-w-12 !px-0">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-red-400/40 bg-neutral-950 px-4 py-3 shadow-2xl"
    >
      <span>{message}</span>
      <Button variant="ghost" onClick={onClose} aria-label="Dispensar aviso" className="!min-h-10 !px-3">
        ✕
      </Button>
    </div>
  );
}

const SYNC_TEXT: Record<SyncStatus, string> = { online: "Online", offline: "Sem conexão", syncing: "Sincronizando…" };

export function SyncBadge({ status, pending }: { status: SyncStatus; pending: number }) {
  const dot = status === "online" ? "bg-accent" : status === "syncing" ? "bg-amber-300" : "bg-red-400";
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-semibold"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {SYNC_TEXT[status]}
      {pending > 0 && <span className="soft">· {pending} na fila</span>}
    </span>
  );
}

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
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 md:hidden">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`min-h-12 truncate rounded-xl px-3 text-[17px] font-semibold transition-colors duration-100 active:scale-[0.98] ${
            value === it.value ? "bg-accent text-black" : "text-white/70"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="soft rounded-2xl border border-dashed border-white/15 p-5 text-center">{children}</p>;
}
