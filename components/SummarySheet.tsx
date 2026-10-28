"use client";

import { useState } from "react";
import { Button, Sheet } from "./ui";
import { buildSummary } from "@/lib/game-logic";
import type { ViewState } from "@/lib/types";

export function SummarySheet({ state, onClose }: { state: ViewState; onClose: () => void }) {
  const [kind, setKind] = useState<"short" | "full">("short");
  const [feedback, setFeedback] = useState("");
  const text = buildSummary(state, kind);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const say = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      say("Copiado!");
    } catch {
      say("Não foi possível copiar. Selecione o texto e copie.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // usuário cancelou o compartilhamento
    }
  };

  return (
    <Sheet title="Resumo do jogo" onClose={onClose} wide>
      <div role="group" aria-label="Versão" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {(["short", "full"] as const).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-11 rounded-lg font-semibold transition-colors duration-100 ${kind === k ? "bg-white text-black" : "text-white/70"}`}
          >
            {k === "short" ? "Curta (redes)" : "Completa"}
          </button>
        ))}
      </div>
      <textarea readOnly value={text} aria-label="Texto do resumo" rows={kind === "full" ? 14 : 6} className="!min-h-40 font-mono !text-base" />
      <p className="soft text-sm">Montado só com o que foi registrado: placar, gols, cartões e substituições.</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={copy} className="flex-1">
          {feedback || "Copiar"}
        </Button>
        {canShare && (
          <Button onClick={share} className="flex-1">
            Compartilhar
          </Button>
        )}
      </div>
    </Sheet>
  );
}
