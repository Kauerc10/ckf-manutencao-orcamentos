-- Fix private.log_activity to handle tables without 'ativo' column gracefully using JSONB casting

CREATE OR REPLACE FUNCTION private.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_action text;
  v_entity_type text := tg_argv[0];
  v_entity_id uuid;
  v_details jsonb;
  v_old_json jsonb;
  v_new_json jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_entity_id := new.id;
    v_new_json := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old_json := to_jsonb(old);
    v_new_json := to_jsonb(new);
    if v_entity_type = 'cliente' and coalesce((v_old_json->>'ativo')::boolean, false) = true and coalesce((v_new_json->>'ativo')::boolean, false) = false then
      v_action := 'archive';
    else
      v_action := 'update';
    end if;
    v_entity_id := new.id;
  else
    v_action := lower(tg_op);
    v_entity_id := old.id;
    v_old_json := to_jsonb(old);
  end if;

  if v_entity_type = 'cliente' then
    if tg_op = 'INSERT' then
      v_details := jsonb_build_object('table', tg_table_name, 'nome', v_new_json->>'nome', 'documento', v_new_json->>'documento');
    else
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'nome', coalesce(v_new_json->>'nome', v_old_json->>'nome'),
        'documento', coalesce(v_new_json->>'documento', v_old_json->>'documento')
      );
    end if;
  elsif v_entity_type = 'cliente_representante' then
    if tg_op = 'INSERT' then
      v_details := jsonb_build_object('table', tg_table_name, 'cliente_id', v_new_json->>'cliente_id', 'nome', v_new_json->>'nome');
    else
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'cliente_id', coalesce(v_new_json->>'cliente_id', v_old_json->>'cliente_id'),
        'nome', coalesce(v_new_json->>'nome', v_old_json->>'nome')
      );
    end if;
  else
    if tg_op = 'INSERT' then
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'cliente_id', v_new_json->>'cliente_id',
        'numero', v_new_json->>'numero'
      );
    else
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'cliente_id', coalesce(v_new_json->>'cliente_id', v_old_json->>'cliente_id'),
        'numero', coalesce(v_new_json->>'numero', v_old_json->>'numero')
      );
    end if;
  end if;

  insert into public.activity_logs (entity_type, entity_id, action, actor_id, details)
  values (
    v_entity_type,
    v_entity_id,
    v_action,
    (select auth.uid()),
    v_details
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;
