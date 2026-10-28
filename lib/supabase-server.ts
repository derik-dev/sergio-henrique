import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Somente servidor (Server Actions / Server Components). SUPABASE_SERVICE_ROLE_KEY não tem prefixo
// NEXT_PUBLIC, então nunca vai para o navegador. Sem ela, o app cai para a chave anon + policies
// abertas da V1 (ver observação sobre RLS em supabase/migrations/*_v1_schema.sql).
export function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Variáveis do Supabase ausentes. Veja o .env.example.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Avisa quem está no link ao vivo que algo mudou (Supabase Realtime Broadcast). Nunca falha a ação. */
export async function broadcastChange(publicToken: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: `live:${publicToken}`, event: "changed", payload: {}, private: false }] }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // o link ao vivo também atualiza por polling; ignorar.
  }
}
