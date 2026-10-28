import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicScreen } from "@/components/PublicScreen";
import { getViewStateByToken } from "@/lib/data";

async function Content({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await getViewStateByToken(token).catch(() => null);
  if (!state) notFound();
  return <PublicScreen token={token} initial={state} />;
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="soft p-6">Carregando jogo…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
