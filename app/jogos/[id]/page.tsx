import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameScreen } from "@/components/GameScreen";
import { getMatchState } from "@/lib/data";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getMatchState(id).catch(() => null);
  if (!state) notFound();
  return <GameScreen initial={state} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="soft p-6">Carregando jogo…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
