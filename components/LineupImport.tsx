"use client";

import { useState } from "react";
import { parseLineup } from "@/app/actions";
import { Button, Sheet } from "./ui";
import type { Op, ParsedLineup } from "@/lib/schemas";
import type { PlayerView } from "@/lib/types";

interface Row {
  key: string;
  number: string;
  name: string;
  low: boolean;
  starter: boolean;
}
interface Team {
  name: string;
  low: boolean;
  rows: Row[];
}
interface Draft {
  home: Team;
  away: Team;
  referee: string;
  assistants: string;
  notes: string | null;
}

const toTeam = (t: ParsedLineup["home"]): Team => ({
  name: t.name,
  low: t.confidence === "low",
  rows: [
    ...t.starters.map((p, i) => ({ p, i, starter: true })),
    ...t.bench.map((p, i) => ({ p, i, starter: false })),
  ].map(({ p, i, starter }) => ({
    key: `${starter ? "s" : "b"}${i}-${crypto.randomUUID()}`,
    number: p.number === null ? "" : String(p.number),
    name: p.name,
    low: p.confidence === "low",
    starter,
  })),
});

const rowInvalid = (r: Row) => !r.name.trim() || r.number === "" || !Number.isInteger(Number(r.number)) || Number(r.number) < 0 || Number(r.number) > 99;

export function LineupImport({
  matchId,
  existing,
  dispatch,
  onImported,
  onClose,
}: {
  matchId: string;
  existing: PlayerView[];
  dispatch: (op: Op) => void;
  onImported?: (count: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [replace, setReplace] = useState(false);
  const [useMeta, setUseMeta] = useState(false);

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("text", text);
      if (file) fd.set("image", file);
      const res = await parseLineup(matchId, fd);
      if (!res.ok) return setError(res.error);
      const d = res.data;
      setDraft({ home: toTeam(d.home), away: toTeam(d.away), referee: d.referee ?? "", assistants: d.assistants ?? "", notes: d.notes });
    } catch {
      setError("Sem conexão com o servidor. O cadastro manual continua disponível.");
    } finally {
      setBusy(false);
    }
  }

  const patchRow = (side: "home" | "away", key: string, patch: Partial<Row>) =>
    setDraft((d) =>
      d && { ...d, [side]: { ...d[side], rows: d[side].rows.map((r) => (r.key === key ? { ...r, ...patch, low: false } : r)) } },
    );
  const removeRow = (side: "home" | "away", key: string) =>
    setDraft((d) => d && { ...d, [side]: { ...d[side], rows: d[side].rows.filter((r) => r.key !== key) } });

  function confirm() {
    if (!draft) return;
    if (replace) {
      existing.filter((p) => p.status !== "removed").forEach((p) => dispatch({ kind: "remove_player", id: p.id }));
    }
    for (const side of ["home", "away"] as const) {
      for (const r of draft[side].rows) {
        dispatch({
          kind: "add_player",
          id: crypto.randomUUID(),
          side,
          name: r.name.trim(),
          shirt_number: Number(r.number),
          is_starter: r.starter,
        });
      }
    }
    if (useMeta) {
      dispatch({
        kind: "update_match",
        ...(draft.home.name.trim() && { home_name: draft.home.name.trim() }),
        ...(draft.away.name.trim() && { away_name: draft.away.name.trim() }),
        ...(draft.referee.trim() && { referee: draft.referee.trim() }),
        ...(draft.assistants.trim() && { assistants: draft.assistants.trim() }),
      });
    }
    onImported?.(draft.home.rows.length + draft.away.rows.length);
    onClose();
  }

  const total = draft ? draft.home.rows.length + draft.away.rows.length : 0;
  const invalid = draft ? [...draft.home.rows, ...draft.away.rows].filter(rowInvalid).length : 0;

  return (
    <Sheet title={draft ? "Conferir escalação" : "Colar escalação"} onClose={onClose} wide>
      {!draft && (
        <div className="flex flex-col gap-4">
          <p className="soft">
            Cole o texto da escalação ou envie um print. Nada é salvo antes de você conferir e confirmar.
          </p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole aqui o texto da escalação…" aria-label="Texto da escalação" />
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/25 px-4 py-2">
            <span className="truncate">{file ? file.name : "📷 Escolher imagem (PNG, JPG ou WebP, até 5 MB)"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <Button
                variant="ghost"
                className="!min-h-10 !px-3"
                onClick={(e) => {
                  e.preventDefault();
                  setFile(null);
                }}
              >
                Remover
              </Button>
            )}
          </label>
          {error && (
            <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-red-200">
              {error}
            </p>
          )}
          <Button variant="primary" disabled={busy || (!text.trim() && !file)} onClick={analyze}>
            {busy ? "Analisando…" : "Analisar escalação"}
          </Button>
        </div>
      )}

      {draft && (
        <div className="flex flex-col gap-5">
          {draft.notes && <p className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-amber-100">⚠ {draft.notes}</p>}
          <p className="soft">
            Campos com <span className="rounded border border-amber-300/60 px-1.5 text-amber-200">revisar</span> tiveram baixa confiança ou estão incompletos.
            Corrija o que for preciso antes de confirmar.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {(["home", "away"] as const).map((side) => (
              <div key={side} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={draft[side].name}
                    onChange={(e) => setDraft({ ...draft, [side]: { ...draft[side], name: e.target.value, low: false } })}
                    aria-label={side === "home" ? "Time da casa" : "Time visitante"}
                    className={`!font-bold ${draft[side].low ? "!border-amber-300/70" : ""}`}
                  />
                </div>
                {(["starters", "bench"] as const).map((grp) => {
                  const rows = draft[side].rows.filter((r) => r.starter === (grp === "starters"));
                  return (
                    <div key={grp} className="flex flex-col gap-2">
                      <span className="label">
                        {grp === "starters" ? "Titulares" : "Reservas"} ({rows.length})
                      </span>
                      {rows.map((r) => {
                        const flag = r.low || rowInvalid(r);
                        return (
                          <div key={r.key} className="flex items-center gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={r.number}
                              onChange={(e) => patchRow(side, r.key, { number: e.target.value })}
                              aria-label="Número"
                              className={`!w-20 shrink-0 text-center font-bold ${flag ? "!border-amber-300/70" : ""}`}
                            />
                            <input
                              value={r.name}
                              onChange={(e) => patchRow(side, r.key, { name: e.target.value })}
                              aria-label="Nome"
                              className={flag ? "!border-amber-300/70" : ""}
                            />
                            {flag && <span className="shrink-0 rounded border border-amber-300/60 px-1.5 text-xs text-amber-200">revisar</span>}
                            <Button variant="ghost" className="!min-w-11 !px-0" aria-label={`Remover ${r.name || "linha"}`} onClick={() => removeRow(side, r.key)}>
                              ✕
                            </Button>
                          </div>
                        );
                      })}
                      {rows.length === 0 && <span className="soft text-sm">Nenhum encontrado.</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="label">Árbitro</span>
              <input value={draft.referee} onChange={(e) => setDraft({ ...draft, referee: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label">Assistentes</span>
              <input value={draft.assistants} onChange={(e) => setDraft({ ...draft, assistants: e.target.value })} />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="!justify-start"
              onClick={() => setDraft({ ...draft, home: draft.away, away: draft.home })}
            >
              ⇄ Inverter casa e visitante
            </Button>
            <label className="flex min-h-12 items-center gap-3">
              <input type="checkbox" checked={useMeta} onChange={(e) => setUseMeta(e.target.checked)} className="!h-6 !min-h-0 !w-6" />
              Usar também nomes dos times e arbitragem
            </label>
            {existing.some((p) => p.status !== "removed") && (
              <label className="flex min-h-12 items-center gap-3">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="!h-6 !min-h-0 !w-6" />
                Substituir a escalação atual (senão, soma aos jogadores existentes)
              </label>
            )}
          </div>

          {invalid > 0 && <p className="text-amber-200">Há {invalid} linha(s) sem nome ou número válido. Corrija ou remova para confirmar.</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Voltar
            </Button>
            <Button variant="primary" className="flex-1" disabled={invalid > 0 || total === 0} onClick={confirm}>
              Confirmar e adicionar {total} jogadores
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
