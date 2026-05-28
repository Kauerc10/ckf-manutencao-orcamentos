-- Migration to fix trigger execution privileges and column-level grants for orcamentos and related tables
-- Resolves error 42501 (insufficient_privilege) on INSERT and UPDATE

-- 1. Redefine private schema trigger functions with SECURITY DEFINER and secure search_path
-- This allows them to execute securely and modify audit columns regardless of user-specific column privileges.

CREATE OR REPLACE FUNCTION private.set_orcamento_criacao_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.criado_por = (select auth.uid());

  IF new.criado_por IS NULL THEN
    RAISE EXCEPTION 'usuario autenticado obrigatorio para criar orcamentos';
  END IF;

  new.excluido_em = null;
  new.excluido_por = null;
  new.exclusao_solicitada_por = null;
  new.excluido_motivo = null;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_orcamento_exclusao_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF old.status = 'excluido' THEN
    RAISE EXCEPTION 'orcamentos excluidos nao podem ser editados';
  END IF;

  IF new.status = 'excluido' THEN
    new.excluido_em = now();
    new.excluido_motivo = nullif(btrim(new.excluido_motivo), '');

    IF new.excluido_por IS NULL THEN
      RAISE EXCEPTION 'administrador aprovador obrigatorio';
    END IF;

    IF new.exclusao_solicitada_por IS NULL THEN
      RAISE EXCEPTION 'solicitante da exclusao obrigatorio';
    END IF;

    IF new.excluido_motivo IS NULL THEN
      RAISE EXCEPTION 'informe o motivo da exclusao';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = new.excluido_por
        AND ativo = true
        AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'administrador aprovador invalido';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = new.exclusao_solicitada_por
        AND ativo = true
    ) THEN
      RAISE EXCEPTION 'solicitante da exclusao invalido';
    END IF;

    RETURN new;
  END IF;

  new.excluido_em = null;
  new.excluido_por = null;
  new.exclusao_solicitada_por = null;
  new.excluido_motivo = null;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_orcamento_update_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.atualizado_por = (select auth.uid());
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_cliente_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.atualizado_em = now();
  new.atualizado_por = (select auth.uid());
  new.uf = upper(new.uf);
  new.documento = regexp_replace(new.documento, '\D', '', 'g');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_representante_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.atualizado_em = now();
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.atualizado_em = now();
  RETURN new;
END;
$$;

-- 2. Grant EXECUTE privileges to authenticated role on all necessary trigger functions
-- This allows the database triggers to fire without raising "permission denied for function" errors.

GRANT EXECUTE ON FUNCTION private.set_orcamento_criacao_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_orcamento_exclusao_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_orcamento_update_actor() TO authenticated;
GRANT EXECUTE ON FUNCTION private.log_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_cliente_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_representante_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_updated_at() TO authenticated;

-- 3. Correct column-level permissions on public.orcamentos for the authenticated role
-- Restores user capacity to set client relations, pre-generate IDs, and insert/update budget revisions.

-- Revoke existing restrictive column grants first to clean up
REVOKE INSERT, UPDATE ON TABLE public.orcamentos FROM authenticated;

-- Grant INSERT on all user-writable fields (explicitly including ID, relation FKs, and revision fields)
GRANT INSERT (
  id,
  data_orcamento,
  servico_cliente,
  status,
  observacoes,
  validade_dias,
  total,
  cliente_id,
  representante_id,
  parent_id,
  revisao
) ON TABLE public.orcamentos TO authenticated;

-- Grant UPDATE on all user-writable fields (explicitly including relation FKs and revision fields)
GRANT UPDATE (
  data_orcamento,
  servico_cliente,
  status,
  observacoes,
  validade_dias,
  total,
  cliente_id,
  representante_id,
  parent_id,
  revisao
) ON TABLE public.orcamentos TO authenticated;

-- Keep table SELECT, DELETE (restricted to admin approved procedure), and sequence usage
GRANT SELECT ON TABLE public.orcamentos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.orcamento_numero_seq TO authenticated;
