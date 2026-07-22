-- Player feedback submissions (append-only; survives player leave).

create table player_feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  lobby_id uuid references lobbies(id) on delete set null,
  message text not null,
  rating int not null,
  created_at timestamptz not null default now(),
  constraint player_feedback_rating_range check (rating between 1 and 5),
  constraint player_feedback_message_len check (char_length(message) between 1 and 2000)
);

create index player_feedback_player_id_idx on player_feedback (player_id);

alter table player_feedback enable row level security;
