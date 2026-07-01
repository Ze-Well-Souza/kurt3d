alter table public.insumos
  add column if not exists classificacao_financeira text not null default 'operacional';

update public.insumos
set classificacao_financeira = 'investimento'
where lower(nome) like '%impressora%';

update public.expenses e
set categoria = case
  when i.classificacao_financeira = 'investimento' then 'Investimento / Imobilizado'
  else 'Despesa Operacional'
end
from public.insumos i
where e.source = 'insumo'
  and e.ref_id = i.id;
