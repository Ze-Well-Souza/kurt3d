alter table public.filamentos
  add column if not exists data_entrega text null;

alter table public.filamentos_history
  add column if not exists data_entrega text null;

alter table public.filamento_payments
  add column if not exists data_para_pagamento date null;

update public.filamento_payments payment
set data_para_pagamento = installments.first_vencimento
from (
  select payment_id, min(vencimento) as first_vencimento
  from public.filamento_payment_installments
  group by payment_id
) installments
where payment.id = installments.payment_id
  and payment.data_para_pagamento is null;
