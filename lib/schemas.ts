import { z } from "zod";

const id = z.uuid();
const personName = z.string().trim().min(1, "Informe o nome").max(80);
const shirt = z.number().int().min(0).max(99);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createMatchSchema = z.object({
  home_name: z.string().trim().min(1, "Informe o time da casa").max(80),
  away_name: z.string().trim().min(1, "Informe o time visitante").max(80),
  competition: optionalText(120),
  referee: optionalText(120),
  assistants: optionalText(200),
});
export type CreateMatchInput = z.input<typeof createMatchSchema>;

const side = z.enum(["home", "away"]);
const iso = z.iso.datetime({ offset: true });
const minute = z.number().int().min(0).max(300).nullable();

export const opSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add_player"), id, side, name: personName, shirt_number: shirt, is_starter: z.boolean() }),
  z.object({ kind: z.literal("update_player"), id, name: personName, shirt_number: shirt }),
  z.object({ kind: z.literal("remove_player"), id }),
  z.object({
    kind: z.literal("record_event"),
    id,
    player_id: id,
    type: z.enum(["goal", "yellow", "red"]),
    minute,
    at: iso,
  }),
  z.object({ kind: z.literal("substitute"), event_id: id, out_id: id, in_id: id, minute, at: iso }),
  z.object({ kind: z.literal("undo"), event_id: id }),
  z.object({
    kind: z.literal("clock"),
    action: z.enum(["start", "pause", "halftime", "second_half", "set"]),
    at: iso,
    seconds: z.number().int().min(0).max(300 * 60).optional(),
  }),
  z.object({ kind: z.literal("set_status"), status: z.enum(["lineup", "live", "finished"]), at: iso }),
  z.object({
    kind: z.literal("update_match"),
    home_name: z.string().trim().min(1).max(80).optional(),
    away_name: z.string().trim().min(1).max(80).optional(),
    referee: z.string().trim().max(120).optional(),
    assistants: z.string().trim().max(200).optional(),
  }),
]);
export type Op = z.infer<typeof opSchema>;

// ---- Importação de escalação por IA (resposta do modelo, validada e tolerante) ----
const confidence = z.enum(["high", "medium", "low"]).catch("medium");
const parsedPlayer = z.object({
  number: z.number().int().min(0).max(99).nullable().catch(null),
  name: z.string().trim().max(80).catch(""),
  confidence,
});
const parsedTeam = z.object({
  name: z.string().trim().max(80).catch(""),
  confidence,
  starters: z.array(parsedPlayer).max(30).catch([]),
  bench: z.array(parsedPlayer).max(30).catch([]),
});
export const parsedLineupSchema = z.object({
  home: parsedTeam,
  away: parsedTeam,
  referee: z.string().trim().max(120).nullable().catch(null),
  assistants: z.string().trim().max(200).nullable().catch(null),
  notes: z.string().trim().max(500).nullable().catch(null),
});
export type ParsedLineup = z.infer<typeof parsedLineupSchema>;
export type ParsedPlayer = z.infer<typeof parsedPlayer>;
