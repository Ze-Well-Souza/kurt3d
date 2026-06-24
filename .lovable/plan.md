## Análise do estado atual

Fiz uma varredura nas 12 telas, na camada de dados (`data.functions.ts` + `repositories.server.ts` + Supabase) e no domínio (`domain/types.ts`, `cost.ts`, `inventory.ts`).

**O que está saudável e funcionando:**
- Toda a persistência roda no Supabase (Lovable Cloud) via `createServerFn`. Não há mistura cliente/servidor.
- Estoque: SKU único (ativo + histórico), abate por transações `reserve → release → consume`, parcelamento de filamentos com quitação.
- Pedidos: transições de status validadas no servidor, custo calculado por `calcOrderCostHybrid` ao finalizar como "Kurtido e Vendido".
- Finanças: receita (vendas) − custo de produção − despesas (insumos automáticos + manuais + falhas) = lucro. Coerente com o que o usuário pediu antes.
- **Multi-usuário já existe**: `admin.settings.tsx → UserManagementCard` permite criar/remover outros admins (server fns `createUser`/`deleteUser` em `auth.functions.ts`). Não precisa implementar — só documentar.

**Problemas encontrados (precisam de correção):**

1. **Código morto crítico — `src/lib/store.ts` (249 linhas)**
   `rg` confirma: ZERO imports no projeto. É uma camada antiga de localStorage que ficou para trás na migração para Supabase. Pior: declara um tipo `Order` divergente (`project` em vez de `projectName`, campo `colors[]` inexistente no domínio atual). Risco real de alguém importar por acidente e quebrar o tipo. **Deletar o arquivo inteiro.**

2. **KPI falso no Painel (`admin.index.tsx` linha 36 e 41)**
   `const impressorasOnline = "6/6"` está chumbado no código — sempre mostra "6/6 — 100%" independentemente da realidade. O usuário tem uma A1 (configurada em Settings). Substituir o card por algo real: **"Despesas (período)"** somando `snap.data.expenses` no mesmo recorte de período já usado para receita/lucro. Mantém os 4 cards mas todos passam a refletir dados reais.

3. **README.md ausente**
   Não existe arquivo na raiz. Criar com: o que é o Kurti 3D, stack (TanStack Start + Supabase via Lovable Cloud), como rodar (`bun install`, `bun dev`, variáveis de ambiente do `.env.example`), estrutura de telas (Estoque, Calculadora, Clientes, Leads, Finanças, Configurações), e seção **"Como adicionar outro administrador"** explicando o caminho Settings → Usuários Admin → Novo Usuário (nome, telefone, usuário, senha ≥8 chars). Inclui também o fluxo financeiro (insumo→despesa, venda→receita, falha→despesa automática).

**O que NÃO vou mexer** (já está bom e funcional):
- Calculadora de custos (já equivalente ao bambucostpro com presets, amortização e margem).
- Tela de Estoque (SKU único, parcelamento, quantidade — tudo conforme pedido nas iteradas anteriores).
- Tela de Finanças (manual + accordion + parcelas).
- Auth / sessão / login.
- Schema do Supabase.

Nenhum bug de regressão funcional detectado; nenhuma dependência exagerada (todos os Radix usados aparecem em telas; `recharts` usado em finanças; `@dnd-kit` no Kanban de pedidos).

## Passo a passo

1. **Deletar `src/lib/store.ts`** (arquivo órfão, confirmado por `rg`).
2. **Corrigir `src/routes/admin.index.tsx`**:
   - Remover `impressorasOnline = "6/6"`.
   - Adicionar `despesas` ao `useMemo` somando `snap.data.expenses` filtradas pelo mesmo período (mês/total) — usar `e.data >= monthStart` quando `period === "month"`.
   - Trocar o 4º card por `{ label: "Despesas (${periodLabel})", value: brl(despesas), delta: "${expensesFiltradas.length} lançamentos" }`.
3. **Criar `README.md` na raiz** com seções: Visão geral · Stack · Como rodar · Variáveis de ambiente · Estrutura das telas · Multi-admin (passo a passo) · Fluxo financeiro · Comandos úteis (`bun dev`, `bun test`, `bun run db:schema:supabase`).
4. **Verificação**: build automático do harness + abrir o Painel via Playwright headless e confirmar que o 4º KPI agora mostra "Despesas".

Sem necessidade de mudanças no schema do Supabase, sem migrações, sem novas dependências.
