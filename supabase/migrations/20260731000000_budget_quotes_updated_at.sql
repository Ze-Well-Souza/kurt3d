-- Adiciona coluna updated_at na tabela budget_quotes
-- O trigger moddatetime já existe no Supabase e tenta atualizar esta coluna,
-- mas a coluna nunca foi criada na migração original, causando:
--   record "new" has no field "updated_at"

ALTER TABLE public.budget_quotes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Preenche valores existentes com created_at
UPDATE public.budget_quotes
  SET updated_at = created_at
  WHERE updated_at IS NULL;

-- Define NOT NULL e DEFAULT para novos registros
ALTER TABLE public.budget_quotes
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();
