-- Live database: revoke PostgREST/anon table access. App traffic uses yobuyobu_app via DATABASE_URL.

revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
grant usage on schema public to yobuyobu_app;
grant select, insert, update, delete on all tables in schema public to yobuyobu_app;
grant usage, select on all sequences in schema public to yobuyobu_app;
