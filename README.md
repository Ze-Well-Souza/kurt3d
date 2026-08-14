# Kurti 3D — Sistema de Gestão de Impressão 3D

Painel administrativo completo para o estúdio Kurti 3D: estoque de filamentos com parcelamento, calculadora de custos profissional (equivalente ao BambuCost Pro), kanban de pedidos com abate automático de filamento, CRM de clientes/leads, controle financeiro de receitas/despesas/lucro e landing page configurável.

## Stack

- **Frontend / SSR:** [TanStack Start](https://tanstack.com/start) v1 + React 19 + Vite 7
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix)
- **Estado servidor:** TanStack Query
- **Backend:** [Lovable Cloud](https://docs.lovable.dev/features/cloud) (Supabase gerenciado) — PostgreSQL via `@supabase/supabase-js` (service role, no servidor)
- **Autenticação:** própria, por cookie de sessão httpOnly (`APP_SESSION_SECRET`) — não usa o Supabase Auth
- **Deploy / runtime:** [Vercel](https://vercel.com) (build via preset `nitro`; ver `vercel.json`)
- **Validação:** Zod
- **Drag & drop:** dnd-kit (kanban de pedidos)
- **Gráficos:** Recharts (finanças)

## Como rodar localmente

```bash
bun install
cp .env.example .env   # preencha com as credenciais do Supabase
bun dev                # http://localhost:8080
```

Outros comandos:

```bash
bun run build           # build de produção
bun run build:dev       # build para preview do Lovable
bun test                # Vitest
bun run lint
bun run format
bun run db:schema:supabase   # aplica supabase/schema.sql no projeto
```

`supabase/schema.sql` é o arquivo canônico: cria todas as tabelas e, no bloco final, liga Row Level Security em cada uma (só `service_role` — usado pelo servidor — tem acesso; a chave anônima do site não lê nem escreve nenhuma tabela). Rodar `db:schema:supabase` num projeto novo já sai com o banco protegido.

## Variáveis de ambiente

Mínimo necessário (ver `.env.example`):

```
SUPABASE_PROJECT_REF=...
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_MANAGEMENT_TOKEN=...
APP_SESSION_SECRET=<string aleatória com 32+ caracteres>
```

`APP_SESSION_SECRET` criptografa o cookie de sessão do admin — gere com `openssl rand -base64 48`.

## Estrutura das telas

| Rota | Função |
| --- | --- |
| `/` | Landing page pública (conteúdo editável em Configurações → Conteúdo do Site) |
| `/acompanhar` | Rastreio público de pedido por código de acompanhamento + WhatsApp do cliente (sem login) |
| `/login` | Login por telefone + senha. Primeiro acesso cria o admin inicial. |
| `/trocar-senha` | Troca obrigatória de senha provisória (bloqueia o painel até ser concluída) |
| `/admin` | **Painel** — KPIs do mês ou total: trabalhos ativos, receita, lucro líquido, despesas |
| `/admin/stock` | **Estoque** — filamentos (SKU único, marca, cor, material, peso, parcelamento), histórico de arquivados e insumos |
| `/admin/portfolio` | **Calculadora e Pedidos** — calculadora de custo por lote (aba Calculadora) + kanban de produção com painel de impressoras (aba Pedidos: Pendente → Imprimindo → Acabamento → Concluído → finalização) |
| `/admin/clients` | **Clientes** — CRM básico (nome, whatsapp, e-mail, notas) |
| `/admin/leads` | **Leads** — mensagens recebidas pela landing page, com conversão em cliente |
| `/admin/orcamentos` | **Orçamentos** — criação de propostas com itens, desconto e validade; conversão em pedido quando aprovado |
| `/admin/calendar` | **Calendário de Produção** — agenda de impressão por impressora, vinculada aos pedidos |
| `/admin/finances` | **Finanças** — visão geral, parcelas, caixa, compras, despesas e vendas, com período global e comparativo mês a mês |
| `/admin/reports` | **Relatórios** — desempenho, receita por mês, top clientes, funil de orçamentos, exportação CSV |
| `/admin/settings` | **Configurações** — perfil do estúdio, parâmetros de custo, senha, usuários admin, conteúdo da landing |

`/admin/fila` continua existindo apenas como redirect para `/admin/portfolio?aba=orders` — links antigos não quebram, mas não é mais um item de menu.

## Multi-administrador — como adicionar outro usuário

Você usa o sistema em conjunto com outro admin. Cada um tem login próprio, mas todos enxergam os mesmos dados.

1. Entre como admin já cadastrado em `/login`.
2. Vá em **Configurações** (engrenagem na barra lateral).
3. Role até o bloco **Usuários Admin** e clique em **Novo Usuário**.
4. Preencha:
   - **Nome** — nome completo do colega
   - **Telefone** — usado para login (somente dígitos, com DDD)
   - **Usuário** — handle interno, único
   - **Senha** — gerada automaticamente (pode editar); mínimo de 8 caracteres, maiúscula, minúscula e número
5. Clique em **Criar**. O novo admin já pode logar em `/login` com telefone + senha.

Você pode remover qualquer admin pelo ícone de lixeira, exceto:

- a si mesmo (proteção contra trancar a própria conta);
- o último admin restante (o sistema sempre exige pelo menos um).

A troca de senha do usuário logado fica no mesmo card de Configurações e exige informar a senha atual (exceto na troca obrigatória de primeiro acesso, quando a senha provisória recém-recebida já serve como prova de identidade). "Resetar senha" e "Reenviar credenciais" sempre geram uma senha provisória nova — o sistema nunca guarda uma senha em texto plano, então uma já gerada não pode ser reexibida depois de fechar o diálogo.

## Fluxo financeiro

Tudo o que aparece em Finanças é alimentado automaticamente — você só lança despesas manuais (aluguel, internet etc.) quando precisar.

| Evento | Efeito financeiro |
| --- | --- |
| Comprar um insumo (Estoque → Insumos) | Despesa automática (categoria "Despesa Operacional" ou "Investimento / Imobilizado", conforme a classificação escolhida) — lançada na hora da compra, independente de parcelamento |
| Comprar filamento parcelado | Cria o plano de parcelas em Finanças → Compras/Parcelas. **Não gera lançamento em Despesas** — o custo do filamento entra no financeiro pelo fluxo de parcelas/caixa, não pela tabela de despesas |
| Registrar pagamento de uma parcela (filamento ou insumo) | Atualiza o saldo da parcela e registra o evento no histórico de pagamentos; não duplica a despesa já lançada na compra do insumo |
| Finalizar pedido como **Kurtido e Vendido** com valor recebido | Receita + custo de produção calculados no momento da finalização, usando os parâmetros de custo atuais de Configurações |
| Finalizar pedido como **Falha de Impressão** | Despesa automática "Perda de Material" com o custo do filamento desperdiçado — mesmo em pedido avulso, sem projeto de portfólio vinculado |
| Finalizar pedido como **Dado de Presente** | Nada (custo já foi abatido do estoque na produção) |

**Fórmula do lucro líquido** (Painel e Finanças usam a mesma regra, em `src/lib/domain/finance-totals.ts`):

```
Lucro = Receita − Custo de Produção − Despesas Operacionais
```

Despesas classificadas como "Investimento / Imobilizado" entram no caixa mas não no lucro do período; insumo com parcelamento próprio não é contado duas vezes (a saída de caixa já está nas parcelas).

O custo de produção de cada venda é calculado no momento da finalização usando filamento real consumido + energia (kWh × tarifa) + depreciação (R$/h) + custo fixo por unidade, com os parâmetros de Configurações **vigentes na hora da finalização**. Vendas já registradas não são recalculadas se você alterar esses parâmetros depois — o valor gravado é o custo real daquela venda no momento em que ela aconteceu.

**Avisos automáticos ao cliente e sincronização com CRM externo não estão implementados.** `notifyOrderStatusChange` e `syncLeadToCrm` (`src/lib/server/order-notifications.server.ts` e `lead-crm.server.ts`) existem como pontos de extensão prontos para um provedor de e-mail/SMS/CRM, mas hoje só registram um log e retornam sem enviar nada — avisar o cliente sobre mudança de status ainda é manual (WhatsApp).

## Calculadora de custos

Equivalente ao [bambucostpro.com](https://bambucostpro.com), com presets de modelo Bambu Lab A1 e A1 Mini (`BAMBU_PRESETS` em `src/lib/domain/portfolio-pricing.ts` — outros modelos entram como preço/vida útil manuais), amortização calculada a partir de preço da impressora ÷ vida útil em horas, % de margem de lucro que gera preço sugerido automaticamente, multi-filamento, custos extras, mão de obra e taxa de gateway/marketplace, com tooltips contextuais explicando cada parâmetro (% desperdício, quantidade do lote, sessão única vs múltiplas sessões).

## Segurança e integridade de dados

- **RLS em todas as tabelas.** A chave pública do site (`VITE_SUPABASE_PUBLISHABLE_KEY`) nunca lê nem escreve o banco diretamente — todo acesso passa pelas server functions, que usam a service role.
- **Rate limit persistido no banco** (`login_rate_limits`), não em memória — sobrevive entre instâncias serverless da Vercel. Cobre login, mutações do painel e as rotas públicas (envio de lead, rastreio de pedido).
- **Gravação granular por linha**, não por substituição de tabela inteira: cada repositório (`src/lib/server/repositories/`) usa `insert`/`update`/`remove` na fábrica `crud-repo.ts`, com guarda contra leitura truncada pelo teto de linhas do PostgREST.
- **Backup:** não há rotina automática de backup no momento — antes de qualquer alteração estrutural no banco, faça um dump manual (`pg_dump` ou export via `scripts/`).

## Estrutura do código

```
src/
├── routes/              # Rotas TanStack (file-based)
├── components/          # UI compartilhada + shadcn
├── lib/
│   ├── api/             # createServerFn (RPC tipado cliente↔servidor)
│   ├── server/          # Helpers server-only (Supabase admin, repos, auth)
│   ├── domain/          # Tipos, regras de custo, regras de inventário, regras financeiras — puro, testado
│   └── config.server.ts # Leitura de env vars
└── styles.css           # Tailwind v4
supabase/schema.sql      # Schema canônico — rodar com bun run db:schema:supabase
```
