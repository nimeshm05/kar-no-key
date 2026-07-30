-- Persist display names used by anonymous visitors (browser UUID).

alter table app_visitors
  add column last_display_name text,
  add column display_names text[] not null default '{}';

-- Optional one-time backfill from historical lobby players:
-- insert into app_visitors (id, first_seen_at, last_seen_at, visit_count, last_display_name, display_names)
-- select
--   id,
--   min(joined_at),
--   max(last_seen_at),
--   1,
--   (array_agg(display_name order by last_seen_at desc))[1],
--   (
--     select array_agg(distinct dn order by dn)
--     from (
--       select distinct on (lower(p2.display_name)) p2.display_name as dn
--       from players p2
--       where p2.id = players.id
--       order by lower(p2.display_name), p2.last_seen_at desc
--     ) distinct_names
--   )
-- from players
-- group by id
-- on conflict (id) do update set
--   last_display_name = coalesce(app_visitors.last_display_name, excluded.last_display_name),
--   display_names = (
--     select array_agg(distinct n order by n)
--     from unnest(app_visitors.display_names || excluded.display_names) as n
--   );
