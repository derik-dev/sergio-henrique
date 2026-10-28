"use client";

import { useState } from "react";
import { Button, Sheet } from "./ui";
import { SubstitutionPicker } from "./SubstitutionPicker";
import type { PlayerView } from "@/lib/types";

export type MenuView = "menu" | "sub" | "edit" | "delete" | "second_yellow";

export interface PlayerMenuActions {
  onSubstitute: (inId: string) => void;
  onYellow: () => void; // já decide sozinho se vira pergunta de 2º amarelo
  onYellowOnly: () => void;
  onRed: () => void;
  onGoal: () => void;
  onEdit: (name: string, shirt: number) => void;
  onDelete: () => void;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-1 hidden rounded-md border border-line-strong px-1.5 text-xs font-medium text-faint lg:inline">
      {children}
    </kbd>
  );
}

export function PlayerMenu({
  player,
  bench,
  view,
  onView,
  onClose,
  actions,
}: {
  player: PlayerView;
  bench: PlayerView[];
  view: MenuView;
  onView: (v: MenuView) => void;
  onClose: () => void;
  actions: PlayerMenuActions;
}) {
  const onField = player.status === "on_field";
  const title = `${player.shirt_number} · ${player.name}`;

  return (
    <Sheet title={title} onClose={onClose}>
      {view === "menu" && (
        <div className="grid grid-cols-2 gap-3">
          {onField && (
            <Button className="col-span-2 !min-h-14" onClick={() => onView("sub")}>
              🔄 Substituir <Kbd>S</Kbd>
            </Button>
          )}
          {onField && (
            <>
              <Button className="!min-h-14" onClick={actions.onYellow}>
                🟨 Amarelo <Kbd>A</Kbd>
              </Button>
              <Button className="!min-h-14" onClick={actions.onRed}>
                🟥 Vermelho <Kbd>V</Kbd>
              </Button>
              <Button className="col-span-2 !min-h-14" onClick={actions.onGoal}>
                ⚽ Gol <Kbd>G</Kbd>
              </Button>
            </>
          )}
          <Button onClick={() => onView("edit")}>✏️ Editar</Button>
          <Button variant="danger" onClick={() => onView("delete")}>
            🗑 Excluir
          </Button>
        </div>
      )}

      {view === "sub" && (
        <SubstitutionPicker out={player} bench={bench} onPick={actions.onSubstitute} onBack={() => onView("menu")} />
      )}

      {view === "second_yellow" && (
        <div className="flex flex-col gap-3">
          <p>
            <strong>{player.name}</strong> já tem um amarelo. Registrar como <strong>vermelho</strong> (2º amarelo)?
          </p>
          <Button variant="primary" className="!min-h-14" onClick={actions.onRed}>
            🟥 Sim, registrar vermelho
          </Button>
          <Button onClick={actions.onYellowOnly}>🟨 Não, só mais um amarelo</Button>
          <Button variant="ghost" onClick={() => onView("menu")}>
            Voltar
          </Button>
        </div>
      )}

      {view === "edit" && <EditForm player={player} onSave={actions.onEdit} onBack={() => onView("menu")} />}

      {view === "delete" && (
        <div className="flex flex-col gap-3">
          <p>
            Excluir <strong>{player.name}</strong> da escalação? Os eventos dele deixam de aparecer no jogo.
          </p>
          <Button variant="danger" className="!min-h-14" onClick={actions.onDelete}>
            Sim, excluir
          </Button>
          <Button variant="ghost" onClick={() => onView("menu")}>
            Cancelar
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function EditForm({
  player,
  onSave,
  onBack,
}: {
  player: PlayerView;
  onSave: (name: string, shirt: number) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [num, setNum] = useState(String(player.shirt_number));
  const valid = name.trim().length > 0 && num !== "" && Number(num) >= 0 && Number(num) <= 99;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(name.trim(), Number(num));
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="label">Número</span>
        <input type="number" inputMode="numeric" min={0} max={99} value={num} onChange={(e) => setNum(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} />
      </label>
      <Button type="submit" variant="primary" disabled={!valid}>
        Salvar
      </Button>
      <Button variant="ghost" onClick={onBack}>
        Cancelar
      </Button>
    </form>
  );
}
