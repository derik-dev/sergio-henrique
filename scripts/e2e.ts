import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { applyMatchOp, createMatch, fetchLiveState, fetchMatchState } from "../app/actions";
import { applyOp, buildSummary, elapsedSeconds, score } from "../lib/game-logic";
import type { Op } from "../lib/schemas";
import type { MatchState } from "../lib/types";

// Teste de ponta a ponta (servidor + banco): roda as mesmas ações do app e compara o estado do
// banco com o reducer otimista do cliente. Uso: npx tsx --env-file=.env.local scripts/e2e.ts
async function main() {
  const created = await createMatch({ home_name: "TESTE Casa", away_name: "TESTE Fora", referee: "Árbitro X" });
  assert(created.ok, "createMatch");
  const id = created.data.id;
  let local = (await fetchMatchState(id))!;
  const token = local.match.public_token;

  // canal de broadcast do link ao vivo
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, key);
  let pings = 0;
  await new Promise<void>((resolve, reject) => {
    sb.channel(`live:${token}`)
      .on("broadcast", { event: "changed" }, () => pings++)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") resolve();
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(new Error("realtime: " + s));
      });
  });

  const run = async (op: Op) => {
    const res = await applyMatchOp(id, op);
    assert(res.ok, `op ${op.kind} falhou: ${res.ok ? "" : res.error}`);
    local = applyOp(local, op);
  };
  const same = async (label: string) => {
    const db = (await fetchMatchState(id))!;
    const norm = (s: MatchState) => ({
      players: s.players.map((p) => [p.id, p.status, p.slot, p.replaced_player_id, p.shirt_number, p.name]).sort(),
      events: s.events.map((e) => [e.id, e.type, e.player_id, e.related_player_id, e.minute, e.undone]).sort(),
      clock: [db.match.status, db.match.period, db.match.clock_running, db.match.clock_base_seconds],
    });
    const a = norm(db);
    const b = norm(local);
    assert.deepEqual(a.players, b.players, `${label}: players divergem`);
    assert.deepEqual(a.events, b.events, `${label}: events divergem`);
    assert.deepEqual(
      [local.match.status, local.match.period, local.match.clock_running, local.match.clock_base_seconds],
      a.clock,
      `${label}: relógio diverge`,
    );
    console.log("ok  ", label);
  };

  const ids = { h1: randomUUID(), h2: randomUUID(), hb: randomUUID(), a1: randomUUID(), a2: randomUUID() };
  const at = () => new Date().toISOString();
  await run({ kind: "add_player", id: ids.h1, side: "home", name: "Goleiro", shirt_number: 1, is_starter: true });
  await run({ kind: "add_player", id: ids.h2, side: "home", name: "Atacante", shirt_number: 9, is_starter: true });
  await run({ kind: "add_player", id: ids.hb, side: "home", name: "Reserva", shirt_number: 14, is_starter: false });
  await run({ kind: "add_player", id: ids.a1, side: "away", name: "Zagueiro", shirt_number: 4, is_starter: true });
  await run({ kind: "add_player", id: ids.a2, side: "away", name: "Meia", shirt_number: 8, is_starter: true });
  await run({ kind: "add_player", id: ids.a1, side: "away", name: "Zagueiro", shirt_number: 4, is_starter: true }); // reenvio: idempotente
  await same("escalação (+ reenvio idempotente)");

  await run({ kind: "clock", action: "start", at: at() });
  await run({ kind: "clock", action: "set", at: at(), seconds: 23 * 60 });
  await same("cronômetro iniciado e ajustado");

  const g1 = randomUUID();
  await run({ kind: "record_event", id: g1, player_id: ids.h2, type: "goal", minute: 24, at: at() });
  await run({ kind: "record_event", id: randomUUID(), player_id: ids.a1, type: "yellow", minute: 25, at: at() });
  await run({ kind: "record_event", id: randomUUID(), player_id: ids.a1, type: "red", minute: 26, at: at() });
  const sub = randomUUID();
  await run({ kind: "substitute", event_id: sub, out_id: ids.h2, in_id: ids.hb, minute: 27, at: at() });
  await run({ kind: "substitute", event_id: sub, out_id: ids.h2, in_id: ids.hb, minute: 27, at: at() }); // reenvio idempotente
  await same("gol, amarelo, vermelho, substituição");
  assert.equal(score(local).home, 1);

  // substituição inválida deve ser recusada pelo banco (quem sai não está em campo)
  const bad = await applyMatchOp(id, { kind: "substitute", event_id: randomUUID(), out_id: ids.h2, in_id: ids.hb, minute: 1, at: at() });
  assert(!bad.ok, "substituição inválida deveria falhar");
  console.log("ok   substituição inválida recusada:", bad.ok ? "" : bad.error);

  await run({ kind: "undo", event_id: sub });
  await same("desfazer substituição (volta ao estado anterior)");
  await run({ kind: "undo", event_id: g1 });
  await run({ kind: "undo", event_id: g1 }); // idempotente
  assert.equal(score(local).home, 0);
  await same("desfazer gol (placar zera)");

  await run({ kind: "update_player", id: ids.a2, name: "Meia Corrigido", shirt_number: 10 });
  await run({ kind: "remove_player", id: ids.a2 });
  await run({ kind: "clock", action: "halftime", at: at() });
  await run({ kind: "clock", action: "second_half", at: at() });
  await run({ kind: "set_status", status: "finished", at: at() });
  await same("editar, excluir, intervalo, 2º tempo, encerrar");
  assert.equal(local.match.status, "finished");

  // validação Zod: op inválida é rejeitada
  const invalid = await applyMatchOp(id, { kind: "add_player", id: "x", side: "home", name: "", shirt_number: 999, is_starter: true });
  assert(!invalid.ok);
  console.log("ok   Zod rejeita dados inválidos");

  // link público: não vaza o ID de edição
  const live = await fetchLiveState(token);
  assert(live && !JSON.stringify(live).includes(id), "link ao vivo vazou o ID de edição!");
  assert.equal(live.players.length, local.players.length);
  console.log("ok   estado público sem o ID de edição");

  console.log("\n" + buildSummary(live, "full") + "\n");

  await new Promise((r) => setTimeout(r, 1500));
  assert(pings >= 10, `broadcast: só ${pings} avisos recebidos`);
  console.log(`ok   Realtime: ${pings} avisos recebidos no canal do link ao vivo`);
  void elapsedSeconds;

  await sb.removeAllChannels();
  const { error } = await createClient(url, key).from("matches").delete().eq("id", id);
  if (error) console.warn("limpeza falhou:", error.message);
  console.log("\nTUDO OK");
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
