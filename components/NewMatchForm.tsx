"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMatch } from "@/app/actions";
import { Button } from "./ui";

function Field({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">
        {label}
        {!required && <span className="normal-case tracking-normal"> (opcional)</span>}
      </span>
      <input name={name} required={required} placeholder={placeholder} maxLength={200} autoComplete="off" />
    </label>
  );
}

export function NewMatchForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-5"
      action={(fd) => {
        setError("");
        start(async () => {
          try {
            const res = await createMatch({
              home_name: String(fd.get("home_name") ?? ""),
              away_name: String(fd.get("away_name") ?? ""),
              competition: String(fd.get("competition") ?? ""),
              referee: String(fd.get("referee") ?? ""),
              assistants: String(fd.get("assistants") ?? ""),
            });
            if (!res.ok) return setError(res.error);
            router.push(`/jogos/${res.data.id}/escalacao`);
          } catch {
            setError("Sem conexão com o servidor. Tente de novo.");
          }
        });
      }}
    >
      <Field label="Time da casa" name="home_name" required placeholder="Ex.: Estrela do Norte" />
      <Field label="Time visitante" name="away_name" required placeholder="Ex.: Vale Verde" />
      <Field label="Competição" name="competition" placeholder="Ex.: Campeonato Estadual" />
      <Field label="Árbitro" name="referee" />
      <Field label="Assistentes" name="assistants" placeholder="Assistente 1, Assistente 2, 4º árbitro…" />
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending} className="!min-h-14 !text-xl">
        {pending ? "Criando…" : "Criar e cadastrar escalação →"}
      </Button>
    </form>
  );
}
