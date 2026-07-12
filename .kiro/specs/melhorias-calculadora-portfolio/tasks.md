# Implementation Plan

## Overview

Implementação segura e incremental das melhorias no sistema Kurti 3D: controle de visibilidade de projetos (público/privado), entrada de tempo de impressão em horas e minutos separados, e três botões de ação pós-cálculo. As tarefas seguem ordem de dependência — fundações de tipo/utilidade primeiro, depois servidor, depois UI.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4", "5"] },
    { "wave": 3, "tasks": ["6", "7", "15"] },
    { "wave": 4, "tasks": ["8", "10", "12"] },
    { "wave": 5, "tasks": ["9", "11", "13", "14"] }
  ]
}
```

## Tasks

- [x] 1. Adicionar campos de visibilidade ao tipo PortfolioProject e migrar schema
  - Atualizar `src/lib/domain/types.ts`: adicionar `isPublic: boolean` (default false) e `publishedAt?: string | null` ao tipo `PortfolioProject`
  - Criar arquivo `supabase/migrations/add_portfolio_visibility.sql` com ALTER TABLE para adicionar colunas `is_public` (boolean NOT NULL DEFAULT false) e `published_at` (timestamptz NULL), UPDATE para marcar registros existentes como públicos com `published_at = created_at`, e indexes de performance
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 7.4, 7.5_

- [x] 2. Criar utilitários de conversão de tempo
  - Criar arquivo `src/lib/domain/time-utils.ts` com funções `timeToMinutes(hours, minutes): number`, `minutesToTime(totalMinutes): { hours, minutes }` e `formatTimePreview(hours, minutes): string`
  - Criar arquivo `src/lib/domain/time-utils.test.ts` com testes unitários cobrindo conversão round-trip, edge cases (0h0min, 999h59min) e formatação de preview
  - _Requirements: 2.3, 2.7, 2.8_

- [x] 3. Atualizar server function addPortfolioProject para suportar visibilidade
  - No arquivo `src/lib/api/functions/portfolio.functions.ts`, adicionar campo `isPublic: z.boolean().default(false)` ao validator da função `addPortfolioProject`
  - No handler, incluir `isPublic: data.isPublic` e `publishedAt: data.isPublic ? now : null` no objeto `project` criado
  - Alterar o retorno para `{ ok: true, projectId: project.id }` (adicionar `projectId`) para que o frontend possa abrir o dialog de pedido após salvar
  - _Requirements: 1.3, 1.4, 3.5, 3.6, 7.1, 7.6_

- [x] 4. Atualizar server function updatePortfolioProject para suportar visibilidade
  - No arquivo `src/lib/api/functions/portfolio.functions.ts`, adicionar campo `isPublic: z.boolean()` ao validator da função `updatePortfolioProject`
  - No handler, implementar lógica de `publishedAt`: se transitando de privado para público (`data.isPublic && !project.isPublic`), definir novo timestamp; se ficando público, manter existente; se indo para privado, preservar valor histórico (não apagar)
  - Incluir `isPublic: data.isPublic` e `publishedAt` no objeto `updated`
  - _Requirements: 1.8, 6.2, 6.3, 7.3, 7.7_

- [x] 5. Filtrar portfólio público no listPublicSnapshot
  - No arquivo `src/lib/api/functions/snapshot.functions.ts`, na função `listPublicSnapshot`, alterar o map de `portfolio.list` para filtrar primeiro apenas projetos com `isPublic === true`: `portfolio.list.filter(item => item.isPublic === true).map(...)`
  - Após o filter+map, ordenar os projetos por `publishedAt` decrescente com nulls por último
  - _Requirements: 1.5, 1.6, 1.7_

- [x] 6. Criar componente TimeInput com campos separados de horas e minutos
  - Criar arquivo `src/components/portfolio/TimeInput.tsx` com dois campos numéricos (`Horas` 0-999, `Minutos` 0-59), preview "Xh Ymin" usando `formatTimePreview`, prop `onChange(totalMinutes)` que converte automaticamente, prop `error` para exibir borda vermelha + mensagem, e `useEffect` para sincronizar quando `totalMinutes` muda (para edição)
  - Importar e usar funções de `src/lib/domain/time-utils.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 5.2_

- [x] 7. Criar componente VisibilityBadge para exibir status público/privado
  - Criar arquivo `src/components/portfolio/VisibilityBadge.tsx` com Badge do shadcn/ui exibindo ícone Globe + "Público" (variant default) ou Lock + "Privado" (variant secondary)
  - Props: `isPublic: boolean`, `className?: string`
  - _Requirements: 6.4, 8.8_

- [x] 8. Substituir botão "Salvar Projeto" pelos três botões de ação na calculadora
  - No arquivo `src/routes/admin.portfolio.tsx`, remover o botão único "+ Salvar Projeto" e substituir por três botões inline: "Salvar Privado" (variant outline, ícone Lock), "Salvar e Publicar no Site" (variant secondary, ícone Globe), "Criar Pedido" (variant default/primary, ícone ShoppingCart)
  - Adicionar Tooltip de cada botão explicando a ação
  - Todos os três botões devem ser desabilitados quando `mutateAddProject.isPending` for true e mostrar ícone Loader2 girando no botão que foi clicado
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.9, 5.5, 8.1, 8.7_

- [x] 9. Implementar handler handleProjectAction na calculadora
  - No arquivo `src/routes/admin.portfolio.tsx`, criar função `handleProjectAction(action: "save-private" | "save-publish" | "create-order")` que valida tempo total > 0, constrói `projectData` com `isPublic: action === "save-publish"`, chama `mutateAddProject.mutateAsync(projectData)`, e executa comportamento específico por ação: save-private (toast "Projeto salvo como privado", reset form), save-publish (toast "Projeto publicado no site", reset form), create-order (toast "Projeto salvo. Criando pedido...", abre `orderDialog` com o `projectId` retornado)
  - Adicionar try/catch com `toast.error` no catch para exibir erros legíveis
  - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.10, 5.6, 5.7_

- [x] 10. Substituir campo tempoMin único pelos campos separados na calculadora
  - No arquivo `src/routes/admin.portfolio.tsx`, atualizar o tipo `FormState` substituindo `tempoMin: string` por `timeHours: string` e `timeMinutes: string`
  - Atualizar `initialForm` com `timeHours: "0"` e `timeMinutes: "0"`
  - Substituir o Input "Tempo do Fatiamento (min)" pelo componente `TimeInput` importado de `src/components/portfolio/TimeInput.tsx`
  - Atualizar o cálculo de `numeric.tempoEntradaMin` para usar `Number(form.timeHours) * 60 + Number(form.timeMinutes)`
  - Atualizar `submitProject` (se ainda existir) para converter horas+minutos antes de salvar
  - Validar que `totalMinutes >= 1` antes de habilitar os botões de ação
  - _Requirements: 2.1, 2.2, 2.3, 2.6, 5.4_

- [x] 11. Atualizar formulário de edição de projeto para suportar visibilidade e tempo separado
  - No arquivo `src/routes/admin.portfolio.tsx`, no dialog de edição de projeto (`editProject`), converter `editProject.tempoMin` para horas e minutos ao abrir usando `minutesToTime()`
  - Usar o componente `TimeInput` no formulário de edição em vez do campo de minutos único
  - Exibir o `VisibilityBadge` do projeto atual durante a edição
  - Atualizar a chamada `mutateUpdateProject.mutate(...)` para incluir `isPublic` baseado na ação selecionada (salvar privado vs publicar) usando os mesmos três botões de ação
  - _Requirements: 2.7, 6.1, 6.2, 6.3, 6.4_

- [x] 12. Exibir badge de visibilidade na tabela de projetos salvos
  - No arquivo `src/routes/admin.portfolio.tsx`, na tabela "Projetos salvos" (`renderCalculatorTab()`), adicionar coluna "Status" ou badge inline no nome do projeto usando o componente `VisibilityBadge` com `p.isPublic ?? false`
  - Garantir que projetos sem campo `isPublic` (criados antes da migração) sejam tratados como públicos (`?? false` seria errado — usar `?? true` para compatibilidade com dados legados sem o campo)
  - _Requirements: 8.8, 4.1_

- [x] 13. Adicionar botão de toggle de visibilidade rápida na tabela de projetos
  - No arquivo `src/routes/admin.portfolio.tsx`, na linha de cada projeto na tabela, adicionar um botão ícone (Globe se privado, Lock se público) que chama `mutateUpdateProject` apenas alterando o campo `isPublic` sem abrir o dialog de edição completo
  - Exibir toast de sucesso "Projeto publicado no site" ou "Projeto removido do site"
  - _Requirements: 1.8, 6.2, 6.3_

- [x] 14. Adicionar campo Tempo (Novo pedido) com horas e minutos separados
  - No arquivo `src/routes/admin.portfolio.tsx`, no dialog "Novo pedido" (`showNewOrder`), substituir o campo `timeMinutes` por dois campos separados (horas e minutos) usando o mesmo padrão do componente `TimeInput` ou o componente diretamente
  - Atualizar o state `newOrder` para ter `timeHours: "1"` e `timeMinutes: "0"` em vez de `timeMinutes: "60"`
  - Calcular `timeMinutes` total na hora do submit: `Number(newOrder.timeHours) * 60 + Number(newOrder.timeMinutes)`
  - _Requirements: 2.1, 2.2_

- [x] 15. Verificar e corrigir compatibilidade de dados legados
  - No arquivo `src/lib/api/functions/portfolio.functions.ts`, na função `listPortfolio` e em qualquer leitura do repositório, garantir que projetos sem `isPublic` definido sejam tratados corretamente (default para `true` em dados legados pré-migração, para não sumir da landing page)
  - No arquivo `src/lib/api/functions/snapshot.functions.ts`, no filtro do `listPublicSnapshot`, usar `item.isPublic !== false` em vez de `item.isPublic === true` para que registros legados sem o campo também apareçam até a migração ser executada, ou garantir que a migração SQL seja executada antes do deploy do código
  - Documentar no README a necessidade de executar a migração SQL antes ou junto do deploy
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Notes

- **Ordem de deploy crítica**: A migração SQL (`supabase/migrations/add_portfolio_visibility.sql`) deve ser executada no Supabase *antes* do deploy do novo código. Se o código for deployado sem a migração, o filtro de visibilidade vai barrar todos os projetos da landing page.
- **Compatibilidade com dados legados**: A tarefa 15 trata o período de transição. A abordagem mais segura é: executar a migração SQL primeiro (que marca todos os registros existentes como `is_public = true`), depois fazer o deploy do código.
- **Sem regressões no formulário**: O campo `tempoMin` interno continua sendo armazenado como total de minutos no banco. Apenas a *interface* de entrada muda para horas+minutos. Toda a lógica de cálculo de custo (`calcAdvancedPortfolioPricing`) continua recebendo minutos totais sem alteração.
- **Retorno de addPortfolioProject**: A tarefa 3 adiciona `projectId` ao retorno da server function. Isso é necessário para o fluxo "Criar Pedido" (tarefa 9) abrir o dialog de criação de pedido pré-preenchido. A mudança é aditiva e não quebra chamadas existentes.
- **Dados legados na tabela**: Projetos criados antes da migração não terão `isPublic` definido no objeto em memória. A tarefa 12 usa `p.isPublic ?? true` (verdadeiro para legados = continuam públicos até a migração).
- **Não há quebra de API**: Todos os campos novos adicionados aos validators Zod são opcionais (`z.boolean().default(false)`) ou adicionados apenas aos campos internos, preservando compatibilidade com clientes existentes.
