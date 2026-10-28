"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchLiveState } from "@/app/actions";
import type { ViewState } from "./types";

/** Mantém a tela ligada durante o jogo. Sem suporte ou sem permissão: falha em silêncio. */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) return void l.release().catch(() => {});
        lock = l;
      } catch {
        // ignorar
      }
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** Relógio de 1 Hz para o cronômetro (só roda enquanto `active`). */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export type LiveStatus = "connecting" | "live" | "reconnecting";

/**
 * Link ao vivo: o servidor avisa por Supabase Realtime (Broadcast) a cada mudança; ao receber o aviso
 * a tela busca o estado novo. Polling a cada 20 s cobre falhas do websocket.
 */
export function useLiveState(token: string, initial: ViewState) {
  const [state, setState] = useState(initial);
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const s = await fetchLiveState(token);
        if (alive && s) setState(s);
      } catch {
        // mantém o último estado
      }
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
    const channel = client
      ?.channel(`live:${token}`)
      .on("broadcast", { event: "changed" }, () => void refresh())
      .subscribe((s) => {
        if (!alive) return;
        setStatus(s === "SUBSCRIBED" ? "live" : "reconnecting");
        if (s === "SUBSCRIBED") void refresh();
      });

    const poll = setInterval(() => void refresh(), 20_000);
    return () => {
      alive = false;
      clearInterval(poll);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [token]);

  return { state, status };
}
