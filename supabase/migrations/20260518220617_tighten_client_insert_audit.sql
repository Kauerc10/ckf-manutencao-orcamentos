drop trigger if exists clientes_set_audit on public.clientes;
create trigger clientes_set_audit
  before insert or update on public.clientes
  for each row execute function private.set_cliente_audit();
