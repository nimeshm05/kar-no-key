create table songs (
  youtube_video_id  text primary key,
  title             text not null,
  channel           text,
  thumbnail_url     text,
  duration_sec      int not null,
  lyrics_phrases    jsonb not null default '[]'::jsonb,
  lyrics_source     text not null default 'lrclib',
  created_at        timestamptz not null default now()
);

alter table lobbies
  add column selected_youtube_video_id text references songs(youtube_video_id),
  add column countdown_start_at timestamptz,
  add column playback_start_at timestamptz;

alter table players
  add column score int not null default 0,
  add column phrases_completed int not null default 0;

alter table lobbies enable row level security;
alter table songs enable row level security;
