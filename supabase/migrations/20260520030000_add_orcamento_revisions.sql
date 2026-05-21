-- Add orcamentos revision columns and replace the unique constraint

ALTER TABLE public.orcamentos
  DROP CONSTRAINT IF EXISTS orcamentos_numero_unique;

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS revisao integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL;

-- Create composite unique constraint to allow multiple revisions of the same budget number
ALTER TABLE public.orcamentos
  ADD CONSTRAINT orcamentos_numero_revisao_unique UNIQUE (numero, revisao);

-- Create index on parent_id to optimize revision queries
CREATE INDEX IF NOT EXISTS orcamentos_parent_id_idx ON public.orcamentos(parent_id);
