create table player_phrase_progress (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references players(id) on delete cascade,
  lobby_id             uuid not null references lobbies(id) on delete cascade,
  youtube_video_id     text not null,
  phrase_index         int not null,
  scored_char_indices  int[] not null default '{}',
  phrase_bonus_awarded boolean not null default false,
  finalized            boolean not null default false,
  updated_at           timestamptz not null default now(),
  unique (player_id, lobby_id, youtube_video_id, phrase_index)
);

create index player_phrase_progress_player_lobby_idx
  on player_phrase_progress (player_id, lobby_id);

alter table player_phrase_progress enable row level security;
