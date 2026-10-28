"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SyncStatus } from "./use-match-store";

// Ponte apenas visual: as telas publicam o estado de sincronização da fila e o cabeçalho fixo exibe.
interface Snap {
  status: SyncStatus | null;
  pending: number;
}
const EMPTY: Snap = { status: null, pending: 0 };
let snap: Snap = EMPTY;
const subs = new Set<() => void>();

function publish(next: Snap) {
  snap = next;
  subs.forEach((f) => f());
}

export function usePublishSync(status: SyncStatus, pending: number) {
  useEffect(() => {
    publish({ status, pending });
  }, [status, pending]);
  useEffect(() => () => publish(EMPTY), []);
}

export function useSyncSnapshot(): Snap {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => snap,
    () => EMPTY,
  );
}

export function useBrowserOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
