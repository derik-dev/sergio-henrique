"use client";

import { useState } from "react";
import { Button, Sheet } from "./ui";

export function ShareSheet({ token, onClose }: { token: string; onClose: () => void }) {
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/ao-vivo/${token}`;
  const [feedback, setFeedback] = useState("");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Copiado!");
    } catch {
      setFeedback("Selecione o link e copie.");
    }
    setTimeout(() => setFeedback(""), 2000);
  };

  return (
    <Sheet title="Link ao vivo" onClose={onClose}>
      <p className="soft">
        Quem receber este link acompanha placar, escalação e lances em tempo real, <strong className="text-white">sem poder editar nada</strong>.
      </p>
      <input readOnly value={url} aria-label="Link de visualização" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={copy}>
          {feedback || "Copiar link"}
        </Button>
        {canShare && (
          <Button className="flex-1" onClick={() => navigator.share({ url }).catch(() => {})}>
            Compartilhar
          </Button>
        )}
      </div>
    </Sheet>
  );
}
