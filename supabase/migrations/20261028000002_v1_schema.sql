-- Anotador de jogos para narradores: schema V1 (demonstração)
-- Substitui as tabelas de teste da migration anterior (aplicada só em ambiente vazio).

drop function if exists public.apply_substitution(uuid, uuid);
drop function if exists public.undo_last_event(uuid);
drop table if exists public.events cascade;
drop table if exists public.players cascade;
drop table if exists public.matches cascade;

create table public.matches (
  id uuid primary key default gen_random_uuid(),            -- ID de EDIÇÃO (link secreto do narrador)
  public_token uuid not null unique default gen_random_uuid(), -- token de VISUALIZAÇÃO (link ao vivo, somente leitura)
  home_name text not null,
  away_name text not null,
  competition text,
  referee text,
  assistants text,
  status text not null default 'lineup' check (status in ('lineup', 'live', 'finished')),
  -- cronômetro: tempo decorrido = clock_base_seconds + (agora - clock_started_at) se estiver rodando
  period text not null default 'pre' check (period in ('pre', 'first', 'halftime', 'second', 'ended')),
  clock_running boolean not null default false,
  clock_base_seconds int not null default 0,
  clock_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  side text not null check (side in ('home', 'away')),
  name text not null,
  shirt_number int not null,
  is_starter boolean not null default false,
  slot int,                                                  -- posição na lista de titulares
  status text not null default 'bench' check (status in ('on_field', 'bench', 'subbed_out', 'removed')),
  replaced_player_id uuid references public.players(id) on delete set null, -- quem saiu para este jogador entrar
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  type text not null check (type in ('goal', 'yellow', 'red', 'sub_in')),
  related_player_id uuid references public.players(id) on delete set null, -- sub_in: quem saiu
  minute int,                                                -- minuto do jogo no momento do evento
  undone boolean not null default false,
  created_at timestamptz not null default now()
);

create index players_match_id_idx on public.players(match_id);
create index events_match_id_idx on public.events(match_id, created_at);

-- Substituição atômica: o reserva assume o slot de quem saiu e o evento é gravado na mesma transação.
-- p_event_id torna a chamada idempotente (reenvio da fila offline não duplica nada).
create function public.make_substitution(
  p_match_id uuid,
  p_out_player_id uuid,
  p_in_player_id uuid,
  p_event_id uuid default gen_random_uuid(),
  p_minute int default null,
  p_at timestamptz default now()
) returns void language plpgsql as $$
declare
  o public.players;
  i public.players;
begin
  if exists (select 1 from public.events where id = p_event_id) then
    return;
  end if;
  select * into o from public.players where id = p_out_player_id and match_id = p_match_id for update;
  select * into i from public.players where id = p_in_player_id and match_id = p_match_id for update;
  if o.id is null or i.id is null or o.side <> i.side then
    raise exception 'Jogadores inválidos para a substituição';
  end if;
  if o.status <> 'on_field' or i.status <> 'bench' then
    raise exception 'Quem sai precisa estar em campo e quem entra, no banco';
  end if;
  update public.players set status = 'subbed_out' where id = o.id;
  update public.players
     set status = 'on_field', slot = o.slot, replaced_player_id = o.id
   where id = i.id;
  insert into public.events (id, match_id, player_id, type, related_player_id, minute, created_at)
  values (p_event_id, p_match_id, i.id, 'sub_in', o.id, p_minute, p_at);
end $$;

-- Desfaz um evento específico por completo (idempotente: desfazer duas vezes não faz nada).
create function public.undo_event(p_match_id uuid, p_event_id uuid)
returns void language plpgsql as $$
declare
  e public.events;
begin
  select * into e from public.events where id = p_event_id and match_id = p_match_id for update;
  if e.id is null or e.undone then
    return;
  end if;
  if e.type = 'sub_in' then
    update public.players set status = 'on_field' where id = e.related_player_id;
    update public.players
       set status = 'bench', slot = null, replaced_player_id = null
     where id = e.player_id;
  end if;
  update public.events set undone = true where id = e.id;
end $$;

-- ATENÇÃO — V1 é DEMONSTRAÇÃO, sem login.
-- As policies abaixo liberam leitura e escrita para a chave anon: o UUID do jogo (impossível de
-- adivinhar) funciona como "link secreto". Quem tiver a chave anon consegue listar e alterar tudo
-- direto pela API REST. Mitigação já preparada: o app só escreve pelo servidor e prefere
-- SUPABASE_SERVICE_ROLE_KEY quando definida; com ela, rode supabase/hardening/tighten_rls.sql.
-- V2: substituir por auth + owner_id + policies por usuário.
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.events enable row level security;

create policy demo_open_access on public.matches for all to anon using (true) with check (true);
create policy demo_open_access on public.players for all to anon using (true) with check (true);
create policy demo_open_access on public.events for all to anon using (true) with check (true);
