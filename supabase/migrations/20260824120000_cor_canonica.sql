-- Cor do filamento passa a sair de uma paleta fechada, com o nome comercial
-- separado em `cor_tom` (texto livre).
--
-- A cor era texto livre e o cadastro juntou 26 grafias para 66 rolos:
-- "Dourada"/"Dourado"/"Ouro claro" para a mesma cor, "SKIN (Cor de pele)" ao
-- lado de "Pele", e base misturada com tom em "Azul Cobalto", "Verde militar",
-- "Marrom Caramelo". Assim nao dava para contar rolos por cor nem comparar
-- preco medio por cor.

alter table public.filamentos add column if not exists cor_tom text null;
alter table public.filamentos_history add column if not exists cor_tom text null;

-- Backup do texto original antes de normalizar. A conversao e proposital e
-- perde informacao em alguns casos ("SKIN (Cor de pele)" -> "Pele"), entao o
-- valor de origem fica guardado para conferencia e eventual rollback.
create table if not exists public.filamentos_cor_backup (
  id text primary key,
  origem text not null,
  cor_original text not null,
  migrado_at timestamptz not null default now()
);

insert into public.filamentos_cor_backup (id, origem, cor_original)
select id, 'filamentos', cor from public.filamentos
on conflict (id) do nothing;

insert into public.filamentos_cor_backup (id, origem, cor_original)
select id, 'filamentos_history', cor from public.filamentos_history
on conflict (id) do nothing;

-- Normalizacao. Le do backup, nao da coluna viva, para poder rodar de novo sem
-- reprocessar um valor ja convertido.
do $$
declare
  alvo text;
begin
  foreach alvo in array array['filamentos', 'filamentos_history'] loop
    execute format($f$
      update public.%I t
      set cor = case
            when b.cor_original ilike 'preto%%'            then 'Preto'
            when b.cor_original ilike 'branco%%'           then 'Branco'
            when b.cor_original ilike 'cinza%%'            then 'Cinza'
            when b.cor_original ilike 'prata%%'            then 'Prata'
            when b.cor_original ilike 'dourad%%'
              or b.cor_original ilike 'ouro%%'             then 'Dourado'
            when b.cor_original ilike 'bronze%%'           then 'Bronze'
            when b.cor_original ilike 'cobre%%'            then 'Cobre'
            when b.cor_original ilike 'amarelo%%'          then 'Amarelo'
            when b.cor_original ilike 'laranja%%'          then 'Laranja'
            when b.cor_original ilike 'vermelho%%'         then 'Vermelho'
            when b.cor_original ilike 'rosa%%'             then 'Rosa'
            when b.cor_original ilike 'roxo%%'             then 'Roxo'
            when b.cor_original ilike 'lil%%s%%'           then 'Lilás'
            when b.cor_original ilike 'azul%%'             then 'Azul'
            when b.cor_original ilike 'ciano%%'            then 'Ciano'
            when b.cor_original ilike 'turquesa%%'         then 'Turquesa'
            when b.cor_original ilike 'verde%%'            then 'Verde'
            when b.cor_original ilike 'marrom%%'           then 'Marrom'
            when b.cor_original ilike 'bege%%'             then 'Bege'
            when b.cor_original ilike 'pele%%'
              or b.cor_original ilike 'skin%%'             then 'Pele'
            when b.cor_original ilike 'natural%%'          then 'Natural'
            when b.cor_original ilike 'transparente%%'     then 'Transparente'
            when b.cor_original ilike 'multicolor%%'       then 'Multicolor'
            else 'Outro'
          end,
          -- Sobra do texto depois da palavra da cor-base. "Azul Cobalto" deixa
          -- "Cobalto"; "Preto" nao deixa nada. Grafias que nao seguem esse
          -- padrao ("SKIN (Cor de pele)") ficam sem tom de proposito.
          cor_tom = nullif(
            btrim(
              regexp_replace(
                b.cor_original,
                '^(preto|branco|cinza|prata|dourad[oa]|ouro|bronze|cobre|amarelo|laranja|vermelho|rosa|roxo|lil[aá]s|azul|ciano|turquesa|verde|marrom|bege|pele|natural|transparente|multicolor)[\s\-]*',
                '',
                'i'
              )
            ),
            ''
          )
      from public.filamentos_cor_backup b
      where b.id = t.id
        and b.origem = %L
    $f$, alvo, alvo);
  end loop;
end
$$;

-- "SKIN (Cor de pele)" cai na regra de Pele mas a sobra vira "(Cor de pele)",
-- que nao e um tom util.
update public.filamentos set cor_tom = null where cor_tom ilike '%(cor de pele)%';
update public.filamentos_history set cor_tom = null where cor_tom ilike '%(cor de pele)%';

-- Tom com inicial maiuscula, para nao misturar "claro" com "Claro" nos filtros.
update public.filamentos set cor_tom = initcap(cor_tom) where cor_tom is not null;
update public.filamentos_history set cor_tom = initcap(cor_tom) where cor_tom is not null;
