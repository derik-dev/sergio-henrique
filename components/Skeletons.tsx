import { Skeleton } from "./ui";

const wrap = "mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pt-6";

export function MatchListSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Carregando jogos" role="status">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
      <Skeleton className="h-52" />
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
    </div>
  );
}

export function GameSkeleton() {
  return (
    <main className={wrap} aria-label="Carregando jogo" role="status">
      <Skeleton className="h-52" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </main>
  );
}

export function LineupSkeleton() {
  return (
    <main className={wrap} aria-label="Carregando escalação" role="status">
      <Skeleton className="h-16 max-w-sm" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[560px]" />
        <Skeleton className="h-[560px]" />
      </div>
    </main>
  );
}
