import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Jogo fictício para demonstração. Uso: npm run seed
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const HOME = "Estrela do Norte";
const AWAY = "Atlético Vale Verde";

const homeStarters: [number, string][] = [
  [1, "Rogério Matos"], [2, "Cléber Lima"], [3, "Anderson Pires"], [4, "Valdir Souza"], [6, "Tiago Brandão"],
  [5, "Marcelo Duarte"], [8, "Fabinho Rocha"], [10, "Leandro Alves"], [7, "Jorginho Lopes"], [9, "Washington Neves"], [11, "Dudu Carvalho"],
];
const homeBench: [number, string][] = [
  [12, "Paulão Ferraz"], [13, "Nilton Prado"], [14, "Zeca Barros"], [15, "Adriano Melo"], [16, "Kauê Dantas"], [17, "Beto Siqueira"], [19, "Renan Gouveia"],
];
const awayStarters: [number, string][] = [
  [1, "Edmilson Tavares"], [2, "Gilmar Freitas"], [3, "Osvaldo Reis"], [4, "Humberto Castro"], [6, "Maicon Barreto"],
  [5, "Silvio Moura"], [8, "Cauã Medeiros"], [10, "Thiago Bastos"], [7, "Elias Nogueira"], [9, "Ricardo Fontes"], [11, "Pedrinho Xavier"],
];
const awayBench: [number, string][] = [
  [12, "Dênis Cordeiro"], [13, "Lucas Viana"], [14, "Wellington Paz"], [15, "Ivan Peixoto"], [16, "Murilo Campos"], [17, "Jonas Teles"], [20, "Samuel Rangel"],
];

type Side = "home" | "away";
interface Seeded {
  id: string;
  side: Side;
  number: number;
  name: string;
  starter: boolean;
  slot: number | null;
  status: "on_field" | "bench" | "subbed_out";
  replaced: string | null;
}

function check<T>(r: { data: T; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

async function main() {
  const now = Date.now();
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();

  // 2º tempo, cronômetro pausado em 67:00 (65 min de bola rolando + intervalo não conta)
  const { id: matchId, public_token: token } = check(
    await db
      .from("matches")
      .insert({
        home_name: HOME,
        away_name: AWAY,
        competition: "Campeonato Estadual — 12ª rodada",
        referee: "Marcos Antônio Vidal",
        assistants: "Paulo Henrique Lins, Roberta Aguiar; 4º árbitro: Fernando Cabral",
        status: "live",
        period: "second",
        clock_running: false,
        clock_base_seconds: 67 * 60,
        clock_started_at: null,
      })
      .select("id, public_token")
      .single(),
    "match",
  ) as { id: string; public_token: string };

  const seeded: Seeded[] = [];
  const add = (side: Side, list: [number, string][], starter: boolean) =>
    list.forEach(([number, name], i) =>
      seeded.push({
        id: randomUUID(),
        side,
        number,
        name,
        starter,
        slot: starter ? i + 1 : null,
        status: starter ? "on_field" : "bench",
        replaced: null,
      }),
    );
  add("home", homeStarters, true);
  add("home", homeBench, false);
  add("away", awayStarters, true);
  add("away", awayBench, false);

  const find = (side: Side, number: number) => {
    const p = seeded.find((x) => x.side === side && x.number === number);
    if (!p) throw new Error(`jogador ${side} ${number} não existe`);
    return p;
  };

  // Eventos (minuto, tipo, jogador). Um gol do visitante foi anulado (desfeito) para exercitar o "desfazer".
  const events: { id: string; type: string; player: Seeded; related?: Seeded; minute: number; ago: number; undone?: boolean }[] = [];
  const ev = (minute: number, type: string, player: Seeded, extra: Partial<(typeof events)[number]> = {}) =>
    events.push({ id: randomUUID(), type, player, minute, ago: 67 - minute + 20, ...extra });

  ev(12, "goal", find("home", 9));
  ev(23, "yellow", find("away", 5));
  ev(34, "goal", find("away", 10));
  ev(41, "goal", find("away", 9), { undone: true }); // anulado (impedimento)
  ev(46, "yellow", find("home", 6));
  // substituição do mandante aos 58': entra 14 no lugar do 7
  const out = find("home", 7);
  const inn = find("home", 14);
  out.status = "subbed_out";
  inn.status = "on_field";
  inn.slot = out.slot;
  inn.replaced = out.id;
  ev(58, "sub_in", inn, { related: out });
  ev(61, "red", find("away", 4));
  ev(66, "goal", find("home", 14));
  // segundo amarelo no 5 do visitante (23' + 64')
  ev(64, "yellow", find("away", 5));

  check(
    await db.from("players").insert(
      seeded.map((p) => ({
        id: p.id,
        match_id: matchId,
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
  // replaced_player_id depois, para respeitar a FK
  for (const p of seeded.filter((x) => x.replaced)) {
    check(await db.from("players").update({ replaced_player_id: p.replaced }).eq("id", p.id), "replaced");
  }
  events.sort((a, b) => a.minute - b.minute);
  check(
    await db.from("events").insert(
      events.map((e) => ({
        id: e.id,
        match_id: matchId,
        player_id: e.player.id,
        type: e.type,
        related_player_id: e.related?.id ?? null,
        minute: e.minute,
        undone: e.undone ?? false,
        created_at: ago(e.ago),
      })),
    ),
    "events",
  );

  console.log("\nJogo de demonstração criado!");
  console.log(`  ${HOME} 2 x 1 ${AWAY} (2º tempo, 67')`);
  console.log(`  Editar:  http://localhost:3000/jogos/${matchId}`);
  console.log(`  Ao vivo: http://localhost:3000/ao-vivo/${token}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
