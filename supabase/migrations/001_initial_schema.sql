-- Lobby lifecycle states
create type lobby_status as enum (
  'waiting',
  'ready',
  'countdown',
  'playing',
  'finished',
  'closed'
);

create table lobbies (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  status           lobby_status not null default 'waiting',
  host_player_id   uuid,
  max_players      int not null default 10,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  expires_at       timestamptz,
  constraint lobbies_code_format check (code ~ '^[A-HJ-KM-NP-Z2-9]{6}$')
);

create unique index lobbies_code_unique on lobbies (code);

-- Reserved for Module 4+ (anonymous player identity)
create table players (
  id           uuid primary key,
  display_name text not null,
  lobby_id     uuid references lobbies(id) on delete cascade,
  is_host      boolean not null default false,
  is_connected boolean not null default true,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index players_lobby_id_idx on players (lobby_id);

-- RLS: deny all direct client access; Edge Functions use service role
alter table lobbies enable row level security;
alter table players enable row level security;
