-- Display names must be unique within a lobby (case-insensitive)
create unique index players_lobby_display_name_unique
  on players (lobby_id, lower(display_name));
