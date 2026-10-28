import type { Op } from "./schemas";

// Fila offline persistente (IndexedDB). Tudo é best-effort: se o IndexedDB não existir
// (modo privado, navegador antigo), o app segue com a fila em memória.
const DB_NAME = "narrador";
const STORE = "queue";

export interface QueuedOp {
  seq: number;
  matchId: string;
  op: Op;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("sem IndexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true }).createIndex("matchId", "matchId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbAdd(matchId: string, op: Op): Promise<number | undefined> {
  try {
    const db = await open();
    const key = await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).add({ matchId, op }));
    db.close();
    return Number(key);
  } catch {
    return undefined;
  }
}

export async function idbAll(matchId: string): Promise<QueuedOp[]> {
  try {
    const db = await open();
    const rows = await wrap(db.transaction(STORE).objectStore(STORE).index("matchId").getAll(matchId));
    db.close();
    return (rows as QueuedOp[]).sort((a, b) => a.seq - b.seq);
  } catch {
    return [];
  }
}

export async function idbDelete(seq: number): Promise<void> {
  try {
    const db = await open();
    await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).delete(seq));
    db.close();
  } catch {
    // ignorar
  }
}

export async function idbClear(matchId: string): Promise<void> {
  const rows = await idbAll(matchId);
  await Promise.all(rows.map((r) => idbDelete(r.seq)));
}
