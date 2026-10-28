-- Rode DEPOIS de definir SUPABASE_SERVICE_ROLE_KEY no servidor (a service role ignora RLS).
-- Remove o acesso aberto da chave anon: o link de visualização passa a funcionar só pelo servidor.
drop policy if exists demo_open_access on public.matches;
drop policy if exists demo_open_access on public.players;
drop policy if exists demo_open_access on public.events;
