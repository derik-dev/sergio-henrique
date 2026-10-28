import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { LiveMinute } from "@/components/LiveMinute";
import { MatchListSkeleton } from "@/components/Skeletons";
import { EmptyState, LinkButton, TeamCrest } from "@/components/ui";
import { listMatches, type MatchSummary, type RecentEvent } from "@/lib/data";
import { buttonClass, gradientGreen } from "@/lib/styles";

const TZ = "America/Sao_Paulo";
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** Só horário quando é de hoje; "Ontem"; senão dia e mês. A data completa não se repete nos cards. */
function whenLabel(iso: string, now: Date) {
  const d = new Date(iso);
  if (day(d) === day(now)) return `Hoje, ${clock(iso)}`;
  if (day(d) === day(new Date(now.getTime() - 864e5))) return `Ontem, ${clock(iso)}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ }).replace(".", "");
}

const href = (m: MatchSummary) => (m.status === "lineup" ? `/jogos/${m.id}/escalacao` : `/jogos/${m.id}`);

const ICON_PROPS = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const IconLive = () => (
  <svg {...ICON_PROPS}>
    <circle cx="10" cy="10" r="2.4" fill="currentColor" stroke="none" />
    <path d="M5.6 5.6a6.2 6.2 0 0 0 0 8.8M14.4 5.6a6.2 6.2 0 0 1 0 8.8" />
  </svg>
);
const IconToday = () => (
  <svg {...ICON_PROPS}>
    <rect x="3.5" y="4.5" width="13" height="12" rx="2.2" />
    <path d="M3.5 8.5h13M7 3v3M13 3v3" />
  </svg>
);
const IconTotal = () => (
  <svg {...ICON_PROPS}>
    <path d="M4 5.5h12M4 10h12M4 14.5h8" />
  </svg>
);

function Stat({ label, value, icon, live }: { label: string; value: number; icon: ReactNode; live?: boolean }) {
  const on = live && value > 0;
  return (
    <div className="flex items-center gap-3.5 rounded-[16px] border border-line bg-s1 px-4 py-3 shadow-card">
      <span className={`hidden h-11 w-11 shrink-0 place-items-center rounded-full sm:grid ${on ? "bg-accent-soft text-accent" : "bg-white/[0.05] text-muted"}`}>{icon}</span>
      <div className="min-w-0">
        <p className="min-h-[2.6em] text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.12em] text-faint sm:min-h-0">{label}</p>
        <p className={`tnum mt-1 text-[40px] font-bold leading-none tracking-tight ${on ? "text-accent" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children, count }: { children: string; count: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
      <span className="tnum rounded-full bg-white/[0.06] px-2 py-px text-[11px] text-muted">{count}</span>
    </h2>
  );
}

const EV_ICON: Record<RecentEvent["type"], string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub_in: "🔄" };

function RecentChip({ e }: { e: RecentEvent }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] py-1 pl-2.5 pr-3 text-[13px]">
      <span className="tnum font-semibold text-muted">{e.minute != null ? `${e.minute}'` : "—"}</span>
      <span aria-hidden="true">{EV_ICON[e.type]}</span>
      <span className="max-w-[10.5rem] truncate font-medium">{e.type === "sub_in" ? `Entra ${e.player}` : e.player}</span>
    </li>
  );
}

function LiveCard({ m }: { m: MatchSummary }) {
  return (
    <Link
      href={href(m)}
      className="group relative block overflow-hidden rounded-[16px] border border-accent/35 bg-s1 p-5 shadow-[0_0_0_1px_rgba(61,220,151,0.1),0_24px_64px_-24px_rgba(61,220,151,0.35)] transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/55 active:scale-[0.995] md:p-7"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[radial-gradient(closest-side,rgba(61,220,151,0.16),transparent)]" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="truncate text-[13px] text-faint">{m.competition ?? "Amistoso"}</span>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          <span className="live-dot h-2 w-2 rounded-full bg-accent" />
          Ao vivo · <LiveMinute clock={m} />
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:mt-6 md:gap-8">
        <div className="flex min-w-0 flex-col items-center gap-2.5 text-center md:flex-row md:gap-4 md:text-left">
          <TeamCrest name={m.home_name} size={68} />
          <span className="line-clamp-2 break-words text-[17px] font-semibold leading-tight md:text-2xl">{m.home_name}</span>
        </div>
        <span
          className="tnum whitespace-nowrap text-[56px] font-bold leading-none tracking-tighter md:text-[88px]"
          aria-label={`${m.score.home} a ${m.score.away}`}
        >
          {m.score.home}
          <span className="px-2 text-[36px] text-faint md:px-4 md:text-[56px]">–</span>
          {m.score.away}
        </span>
        <div className="flex min-w-0 flex-col items-center gap-2.5 text-center md:flex-row-reverse md:gap-4 md:text-right">
          <TeamCrest name={m.away_name} size={68} />
          <span className="line-clamp-2 break-words text-[17px] font-semibold leading-tight md:text-2xl">{m.away_name}</span>
        </div>
      </div>

      <div className="relative mt-6 flex flex-col gap-4 border-t border-white/[0.06] pt-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Últimos lances</p>
          {m.recent.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {m.recent.map((e, i) => (
                <RecentChip key={i} e={e} />
              ))}
            </ul>
          ) : (
            <p className="soft text-sm">Nenhum lance registrado ainda.</p>
          )}
        </div>
        <span className={buttonClass("default", `${gradientGreen} !min-h-12 !px-6 !text-[16px] md:shrink-0`)}>Abrir jogo →</span>
      </div>
    </Link>
  );
}

const cardBase =
  "group block rounded-[16px] border border-line bg-s1 px-4 py-3.5 shadow-card transition-[transform,border-color,box-shadow,opacity] duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(61,220,151,0.25)] hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.9)] active:scale-[0.99]";

function TeamsRow({ m, middle, scores }: { m: MatchSummary; middle: ReactNode; scores?: [number, number] }) {
  const row = (name: string, score?: number) => (
    <div className="flex min-w-0 items-center gap-3">
      <TeamCrest name={name} size={34} />
      <span className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight">{name}</span>
      {score !== undefined && <span className="tnum text-xl font-bold text-muted">{score}</span>}
    </div>
  );
  return (
    <>
      <div className="flex flex-col gap-2.5 sm:hidden">
        {row(m.home_name, scores?.[0])}
        {row(m.away_name, scores?.[1])}
      </div>
      <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-3 sm:grid">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamCrest name={m.home_name} size={34} />
          <span className="truncate text-[16px] font-semibold">{m.home_name}</span>
        </div>
        {middle}
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <span className="truncate text-right text-[16px] font-semibold">{m.away_name}</span>
          <TeamCrest name={m.away_name} size={34} />
        </div>
      </div>
    </>
  );
}

function Progress({ name, value }: { name: string; value: number }) {
  const pct = Math.min(100, Math.round((value / 11) * 100));
  const full = value >= 11;
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-faint">{name}</p>
      <p className="tnum mt-0.5 text-sm font-semibold">
        {value}/11 <span className="font-normal text-muted">titulares</span>
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={11} aria-valuenow={value} aria-label={`${name}: ${value} de 11 titulares`}>
        <div className={`h-full rounded-full ${full ? "bg-accent" : "bg-amber-300"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LineupCard({ m }: { m: MatchSummary }) {
  return (
    <Link href={href(m)} className={cardBase}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-faint">{m.competition ?? "Amistoso"}</span>
        <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-amber-200">Escalação</span>
      </div>
      <TeamsRow m={m} middle={<span className="text-sm font-semibold text-faint">x</span>} />
      <div className="mt-4 grid grid-cols-2 gap-5">
        <Progress name={m.home_name} value={m.starters.home} />
        <Progress name={m.away_name} value={m.starters.away} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[13px] text-faint">Criado às {clock(m.created_at)}</span>
        <span className="inline-flex min-h-10 items-center rounded-btn border border-accent/40 bg-accent-soft px-4 text-sm font-semibold text-accent transition-colors duration-150 group-hover:bg-accent/20">
          Continuar escalação
        </span>
      </div>
    </Link>
  );
}

function FinishedCard({ m, now }: { m: MatchSummary; now: Date }) {
  return (
    <Link href={href(m)} className={`${cardBase} opacity-80 hover:opacity-100`}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-faint">
          {m.competition ?? "Amistoso"} · {whenLabel(m.created_at, now)}
        </span>
        <span className="shrink-0 rounded-full border border-line-strong bg-white/[0.04] px-2.5 py-0.5 font-semibold uppercase tracking-wider text-muted">Encerrado</span>
      </div>
      <TeamsRow
        m={m}
        scores={[m.score.home, m.score.away]}
        middle={
          <span className="tnum min-w-[3.4rem] text-center text-2xl font-bold tracking-tight text-muted" aria-label={`${m.score.home} a ${m.score.away}`}>
            {m.score.home}
            <span className="px-1 text-faint">–</span>
            {m.score.away}
          </span>
        }
      />
    </Link>
  );
}

async function MatchList() {
  let matches: MatchSummary[];
  try {
    matches = await listMatches();
  } catch {
    return (
      <p role="alert" className="rounded-[16px] border border-red-400/40 bg-red-500/10 p-4 text-red-200">
        Não foi possível carregar os jogos. Verifique a conexão e o .env.local, e recarregue.
      </p>
    );
  }
  if (matches.length === 0) {
    return (
      <EmptyState
        title="Nenhum jogo ainda"
        action={
          <LinkButton href="/jogos/novo" variant="primary">
            + Criar o primeiro jogo
          </LinkButton>
        }
      >
        Crie um jogo, cadastre a escalação e comece a anotar com um toque.
      </EmptyState>
    );
  }

  const now = new Date();
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "lineup");
  const done = matches.filter((m) => m.status === "finished");
  const today = matches.filter((m) => day(new Date(m.created_at)) === day(now)).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Ao vivo agora" value={live.length} icon={<IconLive />} live />
        <Stat label="Jogos hoje" value={today} icon={<IconToday />} />
        <Stat label="Total" value={matches.length} icon={<IconTotal />} />
      </div>

      {live.length > 0 && (
        <section aria-label="Ao vivo agora">
          <SectionTitle count={live.length}>Ao vivo agora</SectionTitle>
          <div className="grid gap-4">
            {live.map((m) => (
              <LiveCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}
      <div className={`grid gap-8 ${upcoming.length > 0 && done.length > 0 ? "lg:grid-cols-2" : ""}`}>
        {upcoming.length > 0 && (
          <section aria-label="Próximos (escalação)">
            <SectionTitle count={upcoming.length}>Próximos (escalação)</SectionTitle>
            <div className={`grid gap-3 ${done.length > 0 ? "" : "md:grid-cols-2"}`}>
              {upcoming.map((m) => (
                <LineupCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}
        {done.length > 0 && (
          <section aria-label="Encerrados">
            <SectionTitle count={done.length}>Encerrados</SectionTitle>
            <div className={`grid gap-3 ${upcoming.length > 0 ? "" : "md:grid-cols-2"}`}>
              {done.map((m) => (
                <FinishedCard key={m.id} m={m} now={now} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pb-20 pt-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold md:text-4xl">Jogos</h1>
        <p className="soft text-[15px]">Seus jogos, do vivo ao encerrado.</p>
      </header>
      <Suspense fallback={<MatchListSkeleton />}>
        <MatchList />
      </Suspense>
    </main>
  );
}
