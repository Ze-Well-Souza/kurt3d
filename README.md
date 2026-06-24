# Kurti 3D — Sistema de Gestão de Impressão 3D

Painel administrativo completo para o estúdio Kurti 3D: estoque de filamentos com parcelamento, calculadora de custos profissional (equivalente ao BambuCost Pro), kanban de pedidos com abate automático de filamento, CRM de clientes/leads, controle financeiro de receitas/despesas/lucro e landing page configurável.

## Stack

- **Frontend / SSR:** [TanStack Start](https://tanstack.com/start) v1 + React 19 + Vite 7
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix)
- **Estado servidor:** TanStack Query
- **Backend:** [Lovable Cloud](https://docs.lovable.dev/features/cloud) (Supabase gerenciado) — PostgreSQL + Auth via `@supabase/supabase-js`
- **Runtime:** Cloudflare Workers (edge)
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
|---|---|
| `/` | Landing page pública (conteúdo editável em Configurações → Conteúdo do Site) |
| `/login` | Login por telefone + senha. Primeiro acesso cria o admin inicial. |
| `/admin` | **Painel** — KPIs do mês ou total: trabalhos ativos, receita, lucro líquido, despesas |
| `/admin/stock` | **Estoque** — filamentos (SKU único, marca, cor, material, peso, parcelamento) + insumos |
| `/admin/portfolio` | **Calculadora e Pedidos** — calculadora de custo por lote + kanban (Pendente → Imprimindo → Concluído → finalização) |
| `/admin/clients` | **Clientes** — CRM básico (nome, whatsapp, e-mail, notas) |
| `/admin/leads` | **Leads** — mensagens recebidas pela landing page |
| `/admin/finances` | **Finanças** — receita, despesas (manuais/insumos/falhas), lucro, parcelas de filamento, manual financeiro |
| `/admin/settings` | **Configurações** — perfil do estúdio, parâmetros de custo, senha, usuários admin, conteúdo da landing |

## Multi-administrador — como adicionar outro usuário

Você usa o sistema em conjunto com outro admin. Cada um tem login próprio, mas todos enxergam os mesmos dados.

1. Entre como admin já cadastrado em `/login`.
2. Vá em **Configurações** (engrenagem na barra lateral).
3. Role até o bloco **Usuários Admin** e clique em **Novo Usuário**.
4. Preencha:
   - **Nome** — nome completo do colega
   - **Telefone** — usado para login (somente dígitos, com DDD)
   - **Usuário** — handle interno, único
   - **Senha** — mínimo de 8 caracteres
5. Clique em **Criar**. O novo admin já pode logar em `/login` com telefone + senha.

Você pode remover qualquer admin pelo ícone de lixeira, exceto:
- a si mesmo (proteção contra trancar a própria conta);
- o último admin restante (o sistema sempre exige pelo menos um).

A troca de senha do usuário logado fica no mesmo card de Configurações.

## Fluxo financeiro

Tudo o que aparece em Finanças é alimentado automaticamente — você só lança despesas manuais (aluguel, internet etc.) quando precisar.

| Evento | Efeito financeiro |
|---|---|
| Comprar um insumo (Estoque → Insumos) | Despesa automática categoria "Insumo" |
| Comprar filamento parcelado | Cria parcelas; ao marcar parcela como paga, gera despesa |
| Finalizar pedido como **Kurtido e Vendido** com valor recebido | Receita + custo de produção calculados |
| Finalizar pedido como **Falha de Impressão** | Despesa automática "Perda de Material" com o custo do filamento desperdiçado |
| Finalizar pedido como **Dado de Presente** | Nada (custo já foi abatido do estoque) |

**Fórmula do lucro líquido:**
```
Lucro = Receita − Custo de Produção − Despesas
```
O custo de produção de cada venda é calculado no momento da finalização usando filamento real consumido + energia (kWh × tarifa) + depreciação (R$/h) + custo fixo por unidade, parâmetros definidos em Configurações.

## Calculadora de custos

Equivalente ao [bambucostpro.com](https://bambucostpro.com), com presets de modelo Bambu Lab (X1C, P1S, A1, A1 Mini etc.), amortização calculada a partir de preço da impressora ÷ vida útil em horas, % de margem de lucro que gera preço sugerido automaticamente, e tooltips contextuais explicando cada parâmetro (% desperdício, quantidade do lote, sessão única vs múltiplas sessões).

## Estrutura do código

```
src/
├── routes/              # Rotas TanStack (file-based)
├── components/          # UI compartilhada + shadcn
├── lib/
│   ├── api/             # createServerFn (RPC tipado cliente↔servidor)
│   ├── server/          # Helpers server-only (Supabase admin, repos, auth)
│   ├── domain/          # Tipos, regras de custo, regras de inventário
│   └── config.server.ts # Leitura de env vars
└── styles.css           # Tailwind v4
supabase/schema.sql      # Schema canônico — rodar com bun run db:schema:supabase
```
