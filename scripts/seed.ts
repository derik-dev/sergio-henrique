import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Dados de demonstração: 3 jogos bem montados (1 ao vivo, 1 em escalação, 1 encerrado).
// Uso: npm run seed — é seguro rodar de novo: apaga só os jogos de demonstração/teste anteriores.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const FIRST = ["Rogério", "Cléber", "Anderson", "Valdir", "Tiago", "Marcelo", "Fabinho", "Leandro", "Jorginho", "Washington", "Dudu", "Paulão", "Nilton", "Zeca", "Adriano", "Kauê", "Beto", "Renan", "Edmilson", "Gilmar", "Osvaldo", "Humberto", "Maicon", "Silvio", "Cauã", "Thiago", "Elias", "Ricardo", "Pedrinho", "Murilo"];
const LAST = ["Matos", "Lima", "Pires", "Souza", "Brandão", "Duarte", "Rocha", "Alves", "Lopes", "Neves", "Carvalho", "Ferraz", "Prado", "Barros", "Melo", "Dantas", "Siqueira", "Gouveia", "Tavares", "Freitas", "Reis", "Castro", "Barreto", "Moura", "Medeiros", "Bastos", "Nogueira", "Fontes", "Xavier", "Campos"];
const STARTER_NUMBERS = [1, 2, 3, 4, 6, 5, 8, 10, 7, 9, 11];
const BENCH_NUMBERS = [12, 13, 14, 15, 16, 17, 19];

type Side = "home" | "away";
interface P {
  id: string;
  side: Side;
  number: number;
  name: string;
  starter: boolean;
  slot: number | null;
  status: "on_field" | "bench" | "subbed_out";
  replaced: string | null;
}
interface Ev {
  id: string;
  type: "goal" | "yellow" | "red" | "sub_in";
  player: P;
  related?: P;
  minute: number;
  undone?: boolean;
}

function check<T>(r: { data: T; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

function roster(side: Side, offset: number, starters: number, bench: number): P[] {
  const names = Array.from({ length: 18 }, (_, i) => `${FIRST[(offset + i * 7) % 30]} ${LAST[(offset * 3 + i * 11) % 30]}`);
  const list: P[] = [];
  STARTER_NUMBERS.slice(0, starters).forEach((number, i) =>
    list.push({ id: randomUUID(), side, number, name: names[i], starter: true, slot: i + 1, status: "on_field", replaced: null }),
  );
  BENCH_NUMBERS.slice(0, bench).forEach((number, i) =>
    list.push({ id: randomUUID(), side, number, name: names[11 + i], starter: false, slot: null, status: "bench", replaced: null }),
  );
  return list;
}

interface Spec {
  home: string;
  away: string;
  homeOffset: number;
  awayOffset: number;
  homeCount: [number, number]; // titulares, reservas
  awayCount: [number, number];
  competition: string;
  referee: string;
  assistants: string;
  status: "lineup" | "live" | "finished";
  period: "pre" | "second" | "ended";
  clockBase: number;
  kickoffAgoMin: number;
  script: (h: (side: Side, n: number) => P, add: Script) => void;
}
interface Script {
  goal: (side: Side, n: number, minute: number, undone?: boolean) => void;
  card: (type: "yellow" | "red", side: Side, n: number, minute: number) => void;
  sub: (side: Side, outN: number, inN: number, minute: number) => void;
}

async function build(spec: Spec) {
  const kickoff = Date.now() - spec.kickoffAgoMin * 60_000;
  const at = (minute: number) => new Date(kickoff + (minute + (minute > 45 ? 15 : 0)) * 60_000).toISOString();
  const players = [...roster("home", spec.homeOffset, ...spec.homeCount), ...roster("away", spec.awayOffset, ...spec.awayCount)];
  const find = (side: Side, n: number) => {
    const p = players.find((x) => x.side === side && x.number === n);
    if (!p) throw new Error(`jogador ${side} ${n} não existe em ${spec.home} x ${spec.away}`);
    return p;
  };
  const events: Ev[] = [];
  spec.script(find, {
    goal: (side, n, minute, undone) => events.push({ id: randomUUID(), type: "goal", player: find(side, n), minute, undone }),
    card: (type, side, n, minute) => events.push({ id: randomUUID(), type, player: find(side, n), minute }),
    sub: (side, outN, inN, minute) => {
      const out = find(side, outN);
      const inn = find(side, inN);
      out.status = "subbed_out";
      inn.status = "on_field";
      inn.slot = out.slot;
      inn.replaced = out.id;
      events.push({ id: randomUUID(), type: "sub_in", player: inn, related: out, minute });
    },
  });
  events.sort((a, b) => a.minute - b.minute);

  const m = check(
    await db
      .from("matches")
      .insert({
        home_name: spec.home,
        away_name: spec.away,
        competition: spec.competition,
        referee: spec.referee,
        assistants: spec.assistants,
        status: spec.status,
        period: spec.period,
        clock_running: false,
        clock_base_seconds: spec.clockBase,
        clock_started_at: null,
        created_at: new Date(kickoff).toISOString(),
      })
      .select("id, public_token")
      .single(),
    "match",
  ) as { id: string; public_token: string };

  check(
    await db.from("players").insert(
      players.map((p) => ({
        id: p.id,
        match_id: m.id,
        side: p.side,
        name: p.name,
        shirt_number: p.number,
        is_starter: p.starter,
        slot: p.slot,
        status: p.status,
        replaced_player_id: null,
      })),
    ),
    "players",
  );
  for (const p of players.filter((x) => x.replaced)) {
    check(await db.from("players").update({ replaced_player_id: p.replaced }).eq("id", p.id), "replaced");
  }
  if (events.length > 0) {
    check(
      await db.from("events").insert(
        events.map((e) => ({
          id: e.id,
          match_id: m.id,
          player_id: e.player.id,
          type: e.type,
          related_player_id: e.related?.id ?? null,
          minute: e.minute,
          undone: e.undone ?? false,
          created_at: at(e.minute),
        })),
      ),
      "events",
    );
  }
  return { ...m, label: `${spec.home} x ${spec.away}` };
}

const SPECS: Spec[] = [
  {
    home: "Estrela do Norte",
    away: "Atlético Vale Verde",
    homeOffset: 3,
    awayOffset: 17,
    homeCount: [11, 7],
    awayCount: [11, 7],
    competition: "Campeonato Estadual · 12ª rodada",
    referee: "Marcos Antônio Vidal",
    assistants: "Paulo Henrique Lins, Roberta Aguiar; 4º árbitro: Fernando Cabral",
    status: "live",
    period: "second",
    clockBase: 67 * 60,
    kickoffAgoMin: 82,
    script: (_h, s) => {
      s.goal("home", 9, 12);
      s.card("yellow", "away", 5, 23);
      s.goal("away", 10, 34);
      s.goal("away", 9, 41, true); // anulado (impedimento): exercita o "desfazer"
      s.card("yellow", "home", 6, 46);
      s.sub("home", 7, 14, 58);
      s.card("red", "away", 4, 61);
      s.card("yellow", "away", 5, 64);
      s.goal("home", 14, 66);
    },
  },
  {
    home: "Ferroviário Paulista",
    away: "Sport Clube Litoral",
    homeOffset: 9,
    awayOffset: 24,
    homeCount: [11, 7],
    awayCount: [9, 5], // escalação incompleta de propósito: mostra o botão "Começar jogo" bloqueado
    competition: "Copa Interior",
    referee: "Luciana Prates",
    assistants: "",
    status: "lineup",
    period: "pre",
    clockBase: 0,
    kickoffAgoMin: 6,
    script: () => {},
  },
  {
    home: "Real Brasília FC",
    away: "Associação Cerrado",
    homeOffset: 14,
    awayOffset: 5,
    homeCount: [11, 7],
    awayCount: [11, 7],
    competition: "Série Centro-Oeste",
    referee: "Ednaldo Brito",
    assistants: "Karina Sales, Vitor Ramos",
    status: "finished",
    period: "ended",
    clockBase: 95 * 60,
    kickoffAgoMin: 26 * 60,
    script: (_h, s) => {
      s.goal("home", 9, 9);
      s.goal("away", 7, 21);
      s.goal("home", 10, 33);
      s.card("yellow", "away", 5, 40);
      s.goal("away", 11, 55);
      s.sub("home", 7, 14, 61);
      s.card("yellow", "home", 8, 67);
      s.sub("away", 10, 16, 70);
      s.goal("home", 9, 78);
      s.card("red", "away", 4, 83);
    },
  },
];

async function main() {
  // limpa só o que é de demonstração/teste (nunca jogos reais)
  const names = SPECS.flatMap((s) => [s.home, "Estrela do Norte"]);
  check(await db.from("matches").delete().in("home_name", names), "limpeza (demo)");
  check(await db.from("matches").delete().or("home_name.ilike.%teste%,away_name.ilike.%teste%"), "limpeza (testes)");

  console.log("\nJogos de demonstração criados:");
  for (const spec of SPECS) {
    const r = await build(spec);
    console.log(`  [${spec.status.padEnd(8)}] ${r.label}`);
    console.log(`     editar:  http://localhost:3000/jogos/${r.id}`);
    console.log(`     ao vivo: http://localhost:3000/ao-vivo/${r.public_token}`);
  }
  console.log();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
