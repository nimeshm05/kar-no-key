alter table lobbies alter column max_players set default 8;

update lobbies
set max_players = 8
where max_players > 8;
