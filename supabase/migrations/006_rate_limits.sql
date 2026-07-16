create table rate_limits (
  key            text primary key,
  count          int not null default 1,
  window_start   timestamptz not null default now()
);

alter table rate_limits enable row level security;
