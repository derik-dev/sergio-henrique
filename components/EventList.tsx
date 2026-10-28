import { activeEvents, describeEvent } from "@/lib/game-logic";
import type { ViewState } from "@/lib/types";

export function EventList({ state, open }: { state: ViewState; open?: boolean }) {
  const events = activeEvents(state);
  return (
    <details open={open} className="hide-in-broadcast group rounded-3xl border border-white/10 bg-white/[0.03]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-lg font-semibold">
        <span>Eventos do jogo ({events.length})</span>
        <span className="soft transition-transform duration-100 group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <ol className="flex flex-col gap-1 px-5 pb-4">
        {events.length === 0 && <li className="soft">Nenhum evento registrado ainda.</li>}
        {events.map((e, i) => (
          <li key={e.id} className="flex gap-3 border-t border-white/10 py-2 first:border-t-0">
            <span className="soft w-6 shrink-0 text-right tabular-nums">{i + 1}</span>
            <span>{describeEvent(state, e)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
