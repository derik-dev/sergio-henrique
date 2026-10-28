"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getDb, broadcastChange } from "@/lib/supabase-server";
import { getMatchState, getViewStateByToken } from "@/lib/data";
import { clockPatch } from "@/lib/game-logic";
import { createMatchSchema, opSchema, parsedLineupSchema, type CreateMatchInput, type Op, type ParsedLineup } from "@/lib/schemas";
import type { Match, MatchState, Result, ViewState } from "@/lib/types";

const uuid = z.uuid();
const GENERIC_ERROR = "Não foi possível salvar. Tente novamente.";

export async function createMatch(input: CreateMatchInput): Promise<Result<{ id: string }>> {
  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const { data, error } = await getDb().from("matches").insert(parsed.data).select("id").single();
    if (error || !data) return { ok: false, error: GENERIC_ERROR };
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    console.error("createMatch", e);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Único ponto de escrita do jogo. Toda op é validada com Zod e é idempotente (a fila offline pode reenviar). */
export async function applyMatchOp(matchId: string, raw: unknown): Promise<Result> {
  const id = uuid.safeParse(matchId);
  const parsed = opSchema.safeParse(raw);
  if (!id.success || !parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    const error = await execute(matchId, parsed.data);
    if (error) return { ok: false, error };
    const { data } = await getDb().from("matches").select("public_token").eq("id", matchId).maybeSingle();
    if (data?.public_token) await broadcastChange(data.public_token as string);
    return { ok: true };
  } catch (e) {
    console.error("applyMatchOp", e);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const DUPLICATE = "23505"; // reenvio de uma op que já tinha sido gravada

async function execute(matchId: string, op: Op): Promise<string | null> {
  const db = getDb();
  switch (op.kind) {
    case "add_player": {
      let slot: number | null = null;
      if (op.is_starter) {
        const { data } = await db
          .from("players")
          .select("slot")
          .eq("match_id", matchId)
          .eq("side", op.side)
          .not("slot", "is", null)
          .order("slot", { ascending: false })
          .limit(1);
        slot = ((data?.[0]?.slot as number | undefined) ?? 0) + 1;
      }
      const { error } = await db.from("players").insert({
        id: op.id,
        match_id: matchId,
        side: op.side,
        name: op.name,
        shirt_number: op.shirt_number,
        is_starter: op.is_starter,
        slot,
        status: op.is_starter ? "on_field" : "bench",
      });
      return error && error.code !== DUPLICATE ? GENERIC_ERROR : null;
    }
    case "update_player": {
      const { error } = await db
        .from("players")
        .update({ name: op.name, shirt_number: op.shirt_number })
        .eq("id", op.id)
        .eq("match_id", matchId);
      return error ? GENERIC_ERROR : null;
    }
    case "remove_player": {
      const { error } = await db.from("players").update({ status: "removed" }).eq("id", op.id).eq("match_id", matchId);
      return error ? GENERIC_ERROR : null;
    }
    case "record_event": {
      const { data: p } = await db.from("players").select("id").eq("id", op.player_id).eq("match_id", matchId).maybeSingle();
      if (!p) return "Jogador não encontrado neste jogo.";
      const { error } = await db.from("events").insert({
        id: op.id,
        match_id: matchId,
        player_id: op.player_id,
        type: op.type,
        minute: op.minute,
        created_at: op.at,
      });
      return error && error.code !== DUPLICATE ? GENERIC_ERROR : null;
    }
    case "substitute": {
      const { error } = await db.rpc("make_substitution", {
        p_match_id: matchId,
        p_out_player_id: op.out_id,
        p_in_player_id: op.in_id,
        p_event_id: op.event_id,
        p_minute: op.minute,
        p_at: op.at,
      });
      return error ? error.message : null;
    }
    case "undo": {
      const { error } = await db.rpc("undo_event", { p_match_id: matchId, p_event_id: op.event_id });
      return error ? GENERIC_ERROR : null;
    }
    case "clock":
    case "set_status": {
      const { data, error } = await db.from("matches").select("*").eq("id", matchId).maybeSingle();
      if (error || !data) return GENERIC_ERROR;
      const patch = clockPatch(data as Match, op);
      if (Object.keys(patch).length === 0) return null;
      const { error: upErr } = await db.from("matches").update(patch).eq("id", matchId);
      return upErr ? GENERIC_ERROR : null;
    }
    case "update_match": {
      const { kind: _kind, ...fields } = op;
      void _kind;
      const { error } = await db.from("matches").update(fields).eq("id", matchId);
      return error ? GENERIC_ERROR : null;
    }
  }
}

export async function fetchMatchState(matchId: string): Promise<MatchState | null> {
  if (!uuid.safeParse(matchId).success) return null;
  try {
    return await getMatchState(matchId);
  } catch {
    return null;
  }
}

export async function fetchLiveState(token: string): Promise<ViewState | null> {
  if (!uuid.safeParse(token).success) return null;
  try {
    return await getViewStateByToken(token);
  } catch {
    return null;
  }
}

// ---------- Importação de escalação por IA ----------
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM_PROMPT = `Você extrai escalações de futebol a partir de um texto colado ou de um print.
Responda SOMENTE com um objeto JSON, sem markdown e sem comentários, neste formato:
{
  "home": { "name": string, "confidence": "high"|"medium"|"low", "starters": [{ "number": number|null, "name": string, "confidence": "high"|"medium"|"low" }], "bench": [ ...mesmo formato... ] },
  "away": { ...mesmo formato... },
  "referee": string|null,
  "assistants": string|null,
  "notes": string|null
}
Regras:
- Nunca invente jogadores, números ou nomes. Se algo não estiver no material, use null ou omita a linha.
- "home" é o primeiro time citado (mandante), "away" o segundo.
- Titulares são os 11 iniciais; reservas ficam em "bench".
- "confidence" = "low" quando o texto estiver ilegível, cortado ou ambíguo; "high" quando estiver nítido.
- Mantenha a grafia dos nomes como aparecem. Use o apelido/nome de camisa se for o que está escrito.
- "notes": avisos curtos sobre problemas (ex.: "imagem cortada, só 9 titulares do visitante").`;

export async function parseLineup(matchId: string, formData: FormData): Promise<Result<ParsedLineup>> {
  if (!uuid.safeParse(matchId).success) return { ok: false, error: "Jogo inválido." };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Importação por IA indisponível (ANTHROPIC_API_KEY não configurada). Use o cadastro manual." };
  }
  const text = String(formData.get("text") ?? "").trim().slice(0, 20000);
  const file = formData.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  if (!text && !image) return { ok: false, error: "Cole um texto ou escolha uma imagem." };
  if (image && (!IMAGE_TYPES.includes(image.type as ImageType) || image.size > MAX_IMAGE_BYTES)) {
    return { ok: false, error: "Use uma imagem PNG, JPG ou WebP de até 5 MB." };
  }

  try {
    const { data: m } = await getDb().from("matches").select("id").eq("id", matchId).maybeSingle();
    if (!m) return { ok: false, error: "Jogo não encontrado." };

    const content: Anthropic.ContentBlockParam[] = [];
    if (image) {
      const data = Buffer.from(await image.arrayBuffer()).toString("base64");
      content.push({ type: "image", source: { type: "base64", media_type: image.type as ImageType, data } });
    }
    content.push({ type: "text", text: text ? `Escalação:\n${text}` : "Extraia a escalação desta imagem." });

    const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    const raw = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return { ok: false, error: "A IA não retornou uma escalação legível. Tente outro texto ou use o cadastro manual." };
    const parsed = parsedLineupSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    if (!parsed.success) return { ok: false, error: "A resposta da IA veio num formato inesperado. Tente de novo ou use o cadastro manual." };
    const clean = (rows: ParsedLineup["home"]["starters"]) => rows.filter((r) => r.name || r.number !== null);
    const d = parsed.data;
    return {
      ok: true,
      data: {
        ...d,
        home: { ...d.home, starters: clean(d.home.starters), bench: clean(d.home.bench) },
        away: { ...d.away, starters: clean(d.away.starters), bench: clean(d.away.bench) },
      },
    };
  } catch (e) {
    console.error("parseLineup", e);
    return { ok: false, error: "Não foi possível analisar agora. O cadastro manual continua disponível." };
  }
}
