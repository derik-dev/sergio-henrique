"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyMatchOp, fetchMatchState } from "@/app/actions";
import { applyOp } from "./game-logic";
import { idbAdd, idbAll, idbClear, idbDelete } from "./idb";
import type { Op } from "./schemas";
import type { MatchState } from "./types";

export type SyncStatus = "online" | "offline" | "syncing";

interface Item {
  op: Op;
  seq: Promise<number | undefined>;
}

const RETRY_MS = 4000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Estado do jogo com atualização otimista + fila de operações:
 *  - dispatch() reflete na tela na hora e enfileira a op (persistida em IndexedDB);
 *  - a fila é enviada em ordem; sem conexão, fica parada e tenta de novo;
 *  - erro de validação/negócio do servidor: descarta a fila, avisa e ressincroniza (reverte);
 *  - ao recarregar a página, a fila salva é reaplicada por cima do estado do servidor.
 */
export function useMatchStore(initial: MatchState) {
  const matchId = initial.match.id;
  const [state, setState] = useState(initial);
  const [sync, setSync] = useState<SyncStatus>("online");
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const queue = useRef<Item[]>([]);
  const running = useRef(false);
  const version = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resync = useCallback(async () => {
    const v = version.current;
    try {
      const fresh = await fetchMatchState(matchId);
      if (fresh && v === version.current && queue.current.length === 0) setState(fresh);
    } catch {
      // sem conexão: mantém o estado local
    }
  }, [matchId]);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    if (retry.current) clearTimeout(retry.current);
    setSync("syncing");
    while (queue.current.length > 0) {
      const item = queue.current[0];
      try {
        const res = await applyMatchOp(matchId, item.op);
        if (!res.ok) {
          queue.current = [];
          setPending(0);
          await idbClear(matchId);
          setNotice(res.error);
          running.current = false;
          setSync("online");
          await resync();
          return;
        }
        queue.current.shift();
        setPending(queue.current.length);
        const seq = await item.seq;
        if (seq !== undefined) await idbDelete(seq);
      } catch {
        running.current = false;
        setSync("offline");
        retry.current = setTimeout(() => setRetryTick((n) => n + 1), RETRY_MS);
        return;
      }
    }
    running.current = false;
    setSync("online");
    await resync();
  }, [matchId, resync]);

  const dispatch = useCallback(
    (op: Op) => {
      version.current += 1;
      setState((s) => applyOp(s, op));
      queue.current.push({ op, seq: idbAdd(matchId, op) });
      setPending(queue.current.length);
      void drain();
    },
    [matchId, drain],
  );

  /** Espera a fila esvaziar (usado antes de navegar). Retorna false se não deu (offline). */
  const flush = useCallback(async () => {
    for (let i = 0; i < 80; i++) {
      if (queue.current.length === 0 && !running.current) return true;
      if (!running.current) void drain();
      await sleep(150);
    }
    return false;
  }, [drain]);

  useEffect(() => {
    if (retryTick > 0) void drain();
  }, [retryTick, drain]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await idbAll(matchId);
      if (!alive) return;
      if (saved.length > 0) {
        queue.current = saved.map((r) => ({ op: r.op, seq: Promise.resolve(r.seq) }));
        setPending(saved.length);
        setState((s) => saved.reduce((acc, r) => applyOp(acc, r.op), s));
        void drain();
      } else {
        void resync();
      }
    })();
    const onOnline = () => void drain();
    const onOffline = () => setSync("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSync("offline");
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (retry.current) clearTimeout(retry.current);
    };
  }, [matchId, drain, resync]);

  return { state, dispatch, flush, sync, pending, notice, clearNotice: () => setNotice(null) };
}
