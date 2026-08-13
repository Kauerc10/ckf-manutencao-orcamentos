-- Legacy public deletion RPCs are superseded by the server-side
-- admin-delete-orcamento Edge Function. Remove them so a browser session can
-- never perform approval with a pre-existing administrator JWT.
drop function if exists public.request_orcamento_deletion(uuid, text, text);
drop function if exists public.deny_orcamento_deletion(uuid);
drop function if exists public.delete_orcamento_with_admin_approval(uuid);

-- Ensure PostgREST immediately drops the removed RPCs from its schema cache.
notify pgrst, 'reload schema';
