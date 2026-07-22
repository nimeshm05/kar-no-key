-- Race metrics for awards (WPM / accuracy) and first-to-finish claims.

alter table players
  add column correct_chars int not null default 0,
  add column attempted_chars int not null default 0,
  add column typing_ms int not null default 0,
  add column wpm double precision not null default 0,
  add column accuracy double precision not null default 0;

alter table player_phrase_progress
  add column attempted_char_indices int[] not null default '{}';

create table phrase_first_finish (
  lobby_id uuid not null references lobbies(id) on delete cascade,
  youtube_video_id text not null,
  phrase_index int not null,
  player_id uuid not null references players(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (lobby_id, youtube_video_id, phrase_index)
);

create index phrase_first_finish_lobby_idx
  on phrase_first_finish (lobby_id);

alter table phrase_first_finish enable row level security;

alter table lobbies
  add column awards_snapshot jsonb;
