revoke all on table public.profiles from authenticated;
revoke all on table public.orcamentos from authenticated;
revoke all on table public.orcamento_itens from authenticated;
revoke all on sequence public.orcamento_numero_seq from authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.orcamentos to authenticated;
grant select, insert, update, delete on table public.orcamento_itens to authenticated;
grant usage, select on sequence public.orcamento_numero_seq to authenticated;
