-- Anonymous app visitors (browser UUID), separate from lobby players.

create table app_visitors (
  id             uuid primary key,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  visit_count    int not null default 1,
  constraint app_visitors_visit_count_positive check (visit_count >= 1)
);

create index app_visitors_last_seen_at_idx on app_visitors (last_seen_at);

alter table app_visitors enable row level security;

-- Optional one-time backfill from historical lobby players:
-- insert into app_visitors (id, first_seen_at, last_seen_at, visit_count)
-- select id, min(joined_at), max(last_seen_at), 1
-- from players
-- group by id
-- on conflict (id) do nothing;
