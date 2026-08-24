-- Datas de planejamento do pedido.
--
-- O cadastro de pedido pedia forma e data de pagamento, informacao que so
-- existe depois que a peca fica pronta e e vendida (dialogo "Finalizar
-- Destino"). Faltava o oposto: quando o trabalho comeca e quando esta
-- prometido para o cliente.
alter table public.orders add column if not exists previsao_inicio date null;
alter table public.orders add column if not exists previsao_entrega date null;
