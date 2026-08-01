# 📋 RELATÓRIO COMPLETO DE ESTUDO DE REFATORAÇÃO — CALCULADORA KURTI 3D

**Data do Estudo:** 01/08/2026  
**Responsável Técnico:** Sr FullStack+Data+QA+Lead  
**Projeto:** kurt3d (TS/React + Supabase + TanStack Start + Vitest)

---

## 1️⃣ MAPEAMENTO COMPLETO DA CALCULADORA ATUAL

### 1.1. Arquitetura (Camadas da Clean Arch)

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| **Domínio Puro** | `src/lib/domain/portfolio-pricing.ts` | Função `calcAdvancedPortfolioPricing()` — 100% pura, testável, sem dependências externas |
| **Domínio Puro (Legado)** | `src/lib/domain/pricing-calculator.ts` | Cálculo antigo single-filamento — **hoje é sombra/orfão**, não usado pela UI da calculadora |
| **Domínio Híbrido** | `src/lib/domain/cost.ts` | `calcOrderCostHybrid()` e `calcCostFromInputs()` — usados em pedidos/ordens, não na calculadora principal |
| **UI / React** | `src/routes/admin.portfolio.tsx` | `CalcPedidos` — componente monolítico (~2200 linhas). Renderiza tabs, formulário e KPIs. Faz o parse numérico → chama domínio → renderiza cards |
| **Tipos** | `src/lib/domain/types.ts` (L170-L220) | `CalculatorFilamentoInput`, `CalculatorExtraCost`, `PortfolioProject` |
| **Validação** | `src/lib/api/functions/portfolio.test.ts` | Zod schemas de entrada/saída dos mutations |
| **Persistência** | DB `portfolio_projects` | Schema multi-filamento JSONB + colunas escalares, migração em `supabase/migrations/20260704000000_calculator_multi_filamento.sql` |

### 1.2. Funcionalidades e Regras de Negócio

#### Entrada (campos de formulário):

**Identificação do projeto:**
- Nome do projeto, Categoria (dropdown fixo de 18 itens), Link do Modelo (URL), Galeria de até 10 fotos (com WebP compression)

**Impressora e Amortização:**
- `modeloPreset`: Bambu Lab A1 (150W) / A1 Mini (100W) — de `BAMBU_PRESETS`
- `precoImpressora` + `vidaUtilHoras` → amortização calculada: `precoImpressora / vidaUtilHoras` (substitui `depreciacaoHora` global)
- `margemPercent` (%) aplicada no preço final

**Modo de Entrada (Entry Mode) — estratégia crítica:**
```
"slicer" (padrão atual):   pesoEntrada / unidadesPorImpressao  = pesoUnitario
                            tempoEntradaMin / unidadesPorImpressao = tempoUnitario
                            impressoesLote = ceil(quantidade / unidadesPorImpressao)
"unit":                     pesoEntrada = pesoUnitario / tempoEntradaMin = tempoUnitario
                            impressoesLote = quantidade
```

**Campos do lote:**
- Peso Fatiamento (g), Tempo Fatiamento (Horas + Minutos), Unidades/impressão, Quantidade/lote, % Desperdício (perdaPercent), Preço de Venda (unidade)

**Multi-Filamento** (seção FILAMENTOS — múltiplos cards):
- Marca / Cor / Preço Rolo / Peso Rolo / Peso Usado
- `sumFilamentosCost()`: Σ (precoRolo / pesoRolo) × pesoUsado para cada filamento
- Fallback single-filamento: se `filamentos` vazio → usa `custoRolo/pesoRolo/pesoUnitario` (campos legados do topo)

**Custos Adicionais** (múltiplos):
- Nome / Custo unitário / Quantidade → `sumExtraCosts`: Σ custo × qtde

**Energia, Mão de Obra, Taxas:**
- `custoKwhOverride` (sobrescreve global `tarifa_energia_kwh`)
- Horas Mão de Obra × Valor Hora (R$)
- Taxa Gateway/Marketplace (%) — cálculo especial **inverso**: `preçoSugerido = precoComMargem / (1 - taxa/100)`

#### Cálculo — Pipeline completo (9 passos em `portfolio-pricing.ts` L90-L176):

```
PASSO 1:  Normalização de valores (clampNumber)
PASSO 2:  Consumo kW (preset → watts/1000 OU override)
PASSO 3:  Amortização (precoImpressora/vidaUtil OU depreciacaoHora global)
PASSO 4:  Peso/Tempo Unitário (via entryMode slicer vs unit)
PASSO 5:  Custo filamentos Σ (multi ou fallback) custoFilamentoLote
PASSO 6:  Energia: impressoesLote × (tempoTotal/60) × kW × tarifaKwh
          Depreciação: impressoesLote × (tempoTotal/60) × amortHora
          Fixo: custoFixoUnidade × quantidade
PASSO 7:  Σ Extra Costs + Σ Mão de Obra (horas × valorHora)
PASSO 8:  custoBaseLote = PASSO_5+6+7
          custoPerda = custoBaseLote × (perda/100)
          custoLote = custoBaseLote + custoPerda
PASSO 9:  Preço: precoComMargem = (custoLote/quantidade) × (1+margem/100)
          taxaGateway > 0: divide por (1-taxa/100)   ← inverte a conta para o valor
          repassado chegar ao vendedor líquido
```

#### Saídas atuais (8 KPIs visíveis):
1. Filamentos (lote)
2. Energia+Depreciação (lote)
3. Custos Extras
4. Mão de Obra
5. Desperdício (lote)
6. Custo Total Lote
7. Preço Sugerido/un (verde + botão "Aplicar")
8. Lucro Líquido Lote

#### Ações de persistência:
- Salvar Privado (isPublic=false)
- Salvar e Publicar no Site (isPublic=true + publishedAt)
- **Criar Pedido** (duplica dados para tabela `orders`)
- **Imprimir Orçamento** (função `openPrintQuote` → PDF)

#### Integração Tab "Pedidos":
- Kanban drag-and-drop (4 colunas: A Fazer → Imprimindo → Acabamento → Concluído + 3 badges laterais vendido/presente/falha)
- Order Parts (sub-peças) com status independentes

---

## 2️⃣ VALIDAÇÃO DA INCONSISTÊNCIA DE CÁLCULO DE CUSTO TOTAL (Bambu Studio vs Kurti)

> **Cenário:** 4 filamentos totalizando ~792-793g.
> **Bambu Studio:** Custo = 15,85
> **Kurti (prints do exemplo):** Custo filamento = R$ 79,30 (Custo Total Lote = R$ 135,99)

### 2.1. Prova Matemática de NÃO ser bug na fórmula

**Kurti (calc correta, dados da imagem 1/2/3):**
```
Fórmula sumFilamentosCost(): (R$100 / 1000g) × 793g = R$0,10/g × 793 = R$ 79,30 ✅
```

Extraído de `portfolio-pricing.ts` L70-L78:
```typescript
for (const f of filamentos) {
  if (f.pesoRolo > 0 && f.pesoUsado > 0) {
    total += (f.precoRolo / f.pesoRolo) * f.pesoUsado;
  }
}
```

**Bambu Studio (print do fatiador):**
```
15,85 / 792,54 g = R$ 0,020 / g = R$ 20,00 / kg
```

### 2.2. Conclusão da Inconsistência

**👉 NÃO HÁ ERRO NAS FÓRMULAS DO KURTI.** A diferença de fator 5× (79,30 ÷ 15,85 ≈ 5,00) é **100% explicada por parâmetros de base de dados diferentes**:
- Bambu Studio presumivelmente tem **R$ 20/kg** configurado como padrão de fábrica (filamento genérico barato)
- Kurti no projeto exemplo da imagem tem **R$ 100/kg** (marca "Generic" configurado)

### 2.3. Porém: há o problema de **DIGITAÇÃO MANUAL e DUPLICIDADE de parâmetros**

Isso é o que gera a percepção de inconsistência para o usuário. O Bambu Studio já tem:
- Peso por tipo de filamento (4 valores)
- Métrica de metro/grama por Modelo/Suporte/Corado/Torre
- **Custo já calculado nativamente 15,85**

Mas no Kurti o usuário precisa:
1. Ler 4 linhas de peso manualmente do Bambu Studio (214,14g + 35,50g + 288,31g + 254,59g = 792,54g → arrendonda pra 793g)
2. Criar N cards de Filamento no Kurti
3. **Digitar novamente preçoRolo e pesoRolo de CADA um**

**Risco alto de erro de digitação:** a chance de o usuário colocar um preço errado e achar que o cálculo está quebrado é enorme.

---

## 3️⃣ ANÁLISE CRÍTICA UX/UI DO VISUAL ATUAL

### 3.1. Confirmação: a interface É burocrática e pouco intuitiva — 10 problemas de usabilidade (baseados em Nielsen Norman / Leis de UX)

| # | Princípio Violado | Problema | Severidade |
|---|---|---|---|
| 1 | **Carga Cognitiva** | Um single-page com **~40 campos de input visíveis ao mesmo tempo** em scroll longo. Sem agrupamento em passos (stepper/wizard) | 🔴 Alta |
| 2 | **Agrupamento por proximidade** | 4 seções tem hierarquia visual quase igual — mesma cor, mesma borda, mesmo padding. O usuário não sabe o que vem primeiro | 🔴 Alta |
| 3 | **Feedback visual → Qual é o resultado?** | 8 KPI cards no final em um grid 6-col de mesmo tamanho e pesos visuais iguais. O "Preço Sugerido" e "Lucro Líquido" deveriam ser DESTAQUE | 🔴 Alta |
| 4 | **Ausência de decomposição de custo** | Card "Energia + Depreciação" soma 2 valores distintos sem revelar a fatia individual. Sem gráfico de composição. | 🟠 Média |
| 5 | **Modo entrada confuso** | "Dados do Fatiador" vs (?). Texto explicativo genérico em Badges. Usuário não entende a diferença prática. | 🟠 Média |
| 6 | **Dualidade multi-filamento vs single** | Duas formas AO MESMO TEMPO de dar entrada em filamento. Fallback só é usado se array vazio. Usuário altera campo A e nada muda porque array B tem itens → frustração. | 🔴 Alta |
| 7 | **Lucro Líquido bug conhecido (memory)** | Em admin.portfolio.tsx L425-L427 usa `effectiveLotProfit = precoUnit × qtd - custoLote` — diverge do cálculo interno `lucroLiquido` do domínio (que usa `precoVenda` do input, não `precoSugerido`). | 🟠 Média |
| 8 | **Scroll exaustivo para ações principais** | Os 4 botões CTA estão no **final de 2+ telas de scroll**. Fora do F-pattern de leitura. | 🟠 Média |
| 9 | **Ausência de indicador de integridade / progresso** | Sem feedback tipo: "Pronto! Falta só definir o preço de venda". Sem indicador de campos obrigatórios calculados vs opcionais. | 🟡 Baixa |
| 10 | **Leitura do fatiador: sem integração nativa** | Usuário digita 4 pesos de 4 filamentos manualmente. Tempo de digitação + chance de erro. | 🔴 Alta |

### 3.2. O que está BOM no visual atual (MANTER):

✅ Cores por categoria de custo (Ciano/Yellow/Pink/Orange/Green) → coerente com identidade filament Bambu  
✅ Tooltip `InfoTip` em cada card com explicação → boa prática  
✅ Campo Preço Sugerido com destaque verde **botão Aplicar** → enche o preço de venda (boa decisão)  
✅ Modo tab "Calculadora" ↔ "Pedidos" integrado na mesma página (evita perda de contexto) → manter  

---

## 4️⃣ ANÁLISE DO MODELO DO CONCORRENTE (calculadora dark mode)

### Pontos Fortes a serem importados:

| Item do Concorrente | Descrição | Aplicabilidade Kurti |
|---|---|---|
| **Donut/Pie Chart com %** | Lado direito RESUMO mostra com gráfico: Filamento (45,9%), Energia (19,7%), Taxas (16,4%), Embalagem (17,9%). Proporção é óbvia de 1 relance. | ⭐⭐⭐⭐⭐ **MANTENHA** como widget novo topo do painel direito. |
| **2 colunas: Inputs (esq) vs Resultados em painel fixo (dir)** | Divisão clara de áreas. Scroll só acontece no lado dos inputs. Resultados sempre visíveis ("sticky summary"). | ⭐⭐⭐⭐⭐ **MANTENHA** sticky aside dos resultados. |
| **Consumo de filamento CALCULADO automaticamente** | Campo "Consumo de filamento (g)" aparece como output calculado. | ⭐⭐⭐⭐ Transforme o card "Leitura do Fatiador" em linha de output destacada. |
| **Destaques com peso tipográfico (tamanhos)** | "PREÇO SUGERIDO R$13,38" (enorme), "PREÇO FINAL" (gigante). 4 hierarquias claras de fonte. | ⭐⭐⭐⭐⭐ Kurti atualmente é FLAT — 24 KPI cards mesma fonte 2xl. Quebre em H1/H2/H3. |
| **Dark mode nativo + alto contraste** | Fundo quase preto + labels brancas + R$ em verde limão + valores em amarelo | ⭐⭐⭐ Não é prioridade, mas se já há `dark:` no Tailwind, aproveite. |
| **Diferencial competitivo que temos e o concorrente NÃO TEM:** | Sem lote, sem multi-filamento, sem taxa gateway, sem modo fatiador, sem pedido/kanban. | Vender essas features no lançamento. |

---

## 5️⃣ ESTRUTURA DE DADOS (SUPABASE)

**NENHUMA ALTERAÇÃO NECESSÁRIA NA FASE 1 e 2.**

Estruturas confirmadas:
- `portfolio_projects` tem 25 colunas, todas JSONB + escalares necessárias.
  - `filamentos` (JSONB array), `custos_extras` (JSONB array), `taxa_gateway`, `consumo_kw`, `custo_kwh`, `custo_mao_obra_horas`, `custo_mao_obra_valor_hora`.
- `app_settings` defaults válidos: tarifa=R$0,75, consumo=0,095kW, depreciação=R$0,70/h, custoFixo=R$0,20.
- `filamentos` 32 SKUs estoque real com `preco_pago`, `peso_inicial`, `material`.

---

## 6️⃣ PLANO DE REFATORAÇÃO SEGURO — TABELA DE/PARA

### FASE 1: Safe Lift (não mexe em fórmulas, só UX). NENHUM RISCO.

| # | Componente / Regra (ATUAL — DE) | Estado Atual — De | Novo Estado — Para | Prioridade | Risco |
|---|---|---|---|---|---|
| 6.1 | **Arquitetura do formulário** | Single long scroll de 2200 linhas em `CalcPedidos` | Particionar em 5 componentes: `CalculatorStepHeader`, `CalculatorInputsCol` (sticky + scroll), `CalculatorResultsCol` (sticky top), `CalculatorDonutChart`, `CalculatorSaveActions` | 🔝 P0 | Baixo |
| 6.2 | **Layout 2 colunas (Concorrente)** | 1 coluna full | `grid md:grid-cols-[1fr_420px] gap-6`. Esquerda: inputs em steps collapse. Direita: Sticky Results + Donut Chart sempre visível. | 🔝 P0 | Baixo |
| 6.3 | **Dualidade filamento single vs multi** (Bug #6) | 2 fontes simultâneas de verdade; fallback silencioso | Drop do single-filamento (campos topo `custoRolo/pesoRolo/pesoPeca`). Obrigar uso exclusivo do array multi-filamento `filamentos[]`. Migrar no onLoad do form: se `form.filamentos.length === 0` e `pesoPeca > 0` → auto-popular 1 item. | 🔝 P0 | Baixo |
| 6.4 | **KPI Cards pesos visuais** | 8 cards iguais em grid6-col | Apenas 2 BIG CARDS em destaque (Preço Sugerido /un & Lucro Líquido). Os outros 6: mini-cards no grid. Donut com % ocupa terço do painel resultados. | 🔝 P0 | Muito baixo |
| 6.5 | **Donut Chart decomposição %** | Inexistente (Concorrente tem) | Novo componente. Valores extraídos do mesmo `results`. Categoria filamentos, energia, depreciação, extras, mão obra, perda, taxa. | 🔝 P0 | Baixo |
| 6.6 | **Split "Energia + Depreciação"** | Card único com 2 itens somados | 2 linhas internas no card (ou 2 mini cards separados). Donut já separa. | 🟡 P1 | Baixo |
| 6.7 | **Botões CTA flutuantes / fixos** | Fim do scroll | Fixar `sticky bottom` barra com 4 botões ou mini-resumo lateral. User não precisa scrollar até fim. | 🟡 P1 | Baixo |

### FASE 2: Hardening de Domínio (riscos moderados, com testes)

| # | DE | PARA | Prioridade | Risco |
|---|---|---|---|---|
| 6.8 | **`pricing-calculator.ts` órfão** (não usado) | Excluir (ou marcar @deprecated). Unificar para portfolio-pricing.ts. | 🟡 P1 | Médio |
| 6.9 | **Dualidade effectiveLotProfit (UI) vs lucroLiquido (domínio)** | 2 cálculos independentes em UI L425-L427 | Centralizar no domínio `calcAdvancedPortfolioPricing`: adicionar output `lucroLiquidoConsiderandoPrecoSugerido` caso `precoVenda === 0` (opcional). Explicar qual é qual com label clara. | 🔝 P0 (bug memoria) | Médio |
| 6.10 | **Cobertura de testes portfolio-pricing.ts** | 0 testes. `pricing-calculator.test.ts` cobre outra função! | 12 casos de teste (ver seção 7). | 🔝 P0 (bloqueia a refatoração) | Médio |
| 6.11 | **Entry Mode "slicer" com tempo total e peso total da placa** | Impressões por lote = `ceil(qtd / unidadesPorImpressao)` usa o tempo/energia TOTAL do fatiador em cada impressão. | Documentar com exemplo na UI. Adicionar testes para `slicer mode 24 peças, 4/placa` → 6 impressões × tempo total do fatiador. | 🟡 P1 | Médio |
| 6.12 | **Taxa do Gateway: confirmação do modelo matemático** | Divisão por `(1-taxa/100)` (correto para repasse integral). | Adicionar InfoTip: "Repasse: valor calculado para que você receba Preço Sugerido LÍQUIDO após a taxa do site." | 🟡 P1 | Baixo |

### FASE 3: Feature Incremental (não destrói nada)

| # | DE | PARA | Prioridade | Risco |
|---|---|---|---|---|
| 6.13 | **Entrada manual 4 filamentos** (Problema #10) | Botão "Importar do Bambu Studio (3MF/JSON)" — parse do `3mf` (ZIP XML) ou paste do summary. Auto-popula array multi-filamento. | 🟠 P2 | Baixo |
| 6.14 | **Projeto salvo: valores que não batem se mudar settings** | Tabela "Projetos salvos" recalcula on-the-fly com settings globais do momento! | Persistir snapshot do `results.custoLote`, `receitaTotal`, `lucroLiquido` em colunas novas no DB no momento do save. | 🟡 P1 | Médio (migração reversível) |
| 6.15 | **Snapshot de configurações por projeto** | Campos `custoKwhOverride` etc já existem mas vazio em 90% | No save do projeto: se campos não preenchidos, auto-gravar valores efetivos usados no cálculo (da app_settings). Auditoria futura. | 🟡 P1 | Médio |

---

## 7️⃣ ESTRATÉGIAS DE MITIGAÇÃO DE RISCOS + PLANO DE TESTES

### 7.1. Testes Unitários OBRIGATÓRIOS (antes de QUALQUER refatoração visual)

Falta cobertura no coração da calculadora. **Criar** `src/lib/domain/portfolio-pricing.test.ts` com 12 casos que TRANCAM as fórmulas atuais (regression lock):

| Caso | Entrada | Assertiva Crítica |
|---|---|---|
| **Básico single-filamento (modo unit)** | custoRolo=120/1000g, pesoEntrada=100g, tempo=120min, qtd=1, margem=50%, perda=0, sem extra, sem taxa | `custoFilamento=12`, `precoSugerido=(12+energia+dep)*1.5` |
| **Multi-filamento (4 filamentos do exemplo Bambu)** | 4 filamentos total 792g, cada um com preço R$20/kg | Total = R$15,85 → validar `custoFilamentosDetalhado = R$15,85` **FECHA A DÚVIDA da inconsistência #2** |
| **Slicer mode / unidadesPorImpressao=4, qtd=24** | pesoEntrada=400g (100×4), tempo=480min | pesoUnit=100g, `impressoesLote=6`, energia=6×8h×kW×tarifa |
| **Desperdício 10%** | base=100, perda=10% | `custoPerda=10, custoLote=110` |
| **Taxa gateway 10% e margem 50%** | custoUnid=100 | `precoComMargem=150`. `precoSugerido=150 / (0,9)=166,67`. `taxaGatewayAplicada=16,67`. |
| **Gateway 0** | mesmos acima | divisão NÃO acontece |
| **Mão de Obra 2h × R$25** | entrada=horas×valor | `custoTrabalho=50` |
| **Custos Extras 2 itens (5×2 + 10×1)** | custo × qtd | `custoExtraTotal=20` |
| **Preset A1 150W** vs Override kW | modeloPreset=A1 → 0,15kW. Override custoKwh. | Consumo e energia batem. |
| **Depreciação: precoImpressora=5299 / vida=5000** | entrada=48,5h do exemplo print1 | `amortHora=1,06`. `custoDepreciação ≈ 48,5 × 1,06 = 51,41`. Energia + Depreciação ≈ 56,50 (FECHA img 2 R$56,49!) |
| **Lucro Líquido: precoVenda vs vazio (fallback precoSugerido)** | Caso bug memory | `lucroLiquido bate effectiveLotProfit` |
| **Edge: qtd=0, pesoRolo=0** → clampNumber | Valores absurdos | Nenhum NaN, Infinity, divisão zero. Clamp 0. |

### 7.2. Testes de Integração

- **Snapshot test**: 1 projeto completo de exemplo (Mascote Palmeiras 30cm). Rodar `calcAdvancedPortfolioPricing` → gravar JSON resultados como snapshot. Se refatoração quebrar em 1 centavo, teste quebra.
- **Tab Projetos Salvos → Recalcula igual** : Projeto salvo JSONB multi-filamento. Carregar via `usePortfolio`, rodar `calcAdvancedPortfolioPricing` em memória, bater com valores da tabela.

### 7.3. Testes E2E / Usabilidade (Playwright existente via MCP)

1. **Cenário feliz**: Preenche Nome→Categoria→4 filamentos→preco de venda→Cria pedido. Todo fluxo.
2. **Cenário reset**: Preenche, clica em Limpar → estado inicial intacto.
3. **Validação**: Preenche filamento com peso 0 → não crasha (clampNumber).
4. **Copy button Aplicar preço**: Clica em Aplicar → campo PreçoVenda copiado exato.

### 7.4. Plano de Rollback Imediato (3 níveis de segurança)

**Nível 1 — Feature Flag (front-end, zero risco):**
- Criar boolean `useNewCalculatorLayout` em `app_settings` (jsonb `printer_prices` já tem estrutura para flags).
- Todo o código novo é condicional: `useNewCalculatorLayout ? <CalculatorV2 /> : <CalcPedidos />`.
- Rollback em 1 clique no Painel de Configurações do admin.

**Nível 2 — Git revert (5 min):**
- Commits atômicos por fase (Fase 1, Fase 2, Fase 3) com prefixo `calc-refactor/F1-6.1_*`.
- PR separado por fase para aprovação.

**Nível 3 — DB NÃO sofre alterações destrutivas até Fase 3:**
- Fases 1 e 2: NENHUMA migration. Tudo usa estrutura 25 colunas já existente.
- Fase 3 (6.14/6.15 novas colunas): Migrations UP/DOWN (reversíveis). Se algo quebrar: `supabase db revert`.

**Integridade de dados durante:**
- `portfolio_projects` só sofre UPDATE / INSERT com os mesmos campos (backward compat).
- Snapshot antes do deploy full: `pg_dump public.portfolio_projects > backup_YYYYMMDD.sql`.

---

## 8️⃣ ÍNDICE DE ARQUIVOS E LINKS DE REFERÊNCIA

| Arquivo | O que estudar |
|---|---|
| `src/lib/domain/portfolio-pricing.ts` | 💚 Coração: 9 passos do cálculo. Funções `calcAdvancedPortfolioPricing`, `sumFilamentosCost`, `sumExtraCosts`. |
| `src/routes/admin.portfolio.tsx` | 📄 Componentes monolíticos CalcPedidos. Parse numérico L395-L422, KPIs L1844-L1872, bug lucro L425-L427 |
| `src/lib/domain/types.ts` (L170-L220) | Tipos CalculatorFilamentoInput, CalculatorExtraCost, PortfolioProject |
| `src/lib/domain/pricing-calculator.ts` | ⚠️ Função órfã single-filamento não usada pela calculadora nova UI |
| `src/lib/domain/cost.ts` | Cálculos de Pedido/Kanban (não afetam calculadora portfolio) |
| `supabase/migrations/20260704000000_calculator_multi_filamento.sql` | Migrations multi-filamento (7 colunas novas OK) |
| `src/lib/api/functions/portfolio.test.ts` | Zod schemas; falta testar função domínio |
| `src/lib/domain/finance-schedule.test.ts` | 💚 Exemplo de suíte Vitest existente no projeto para copiar padrão |

---

## 9️⃣ SUMÁRIO EXECUTIVO — O QUE FAZER EM ORDEM

### P0 (Essencial para não ter bugs):
1. ✅ **Escrever 12 testes unitários** `portfolio-pricing.test.ts` — travar as fórmulas atuais
2. ✅ **Corrigir dualidade effectiveLotProfit vs lucroLiquido**
3. ✅ **Eliminar dualidade single/multi-filamento** (migrar 100% para array multi)
4. ✅ **Extrair componentes menores** + layout 2 colunas com results sticky

### P1 (Melhora UX sem quebrar nada):
1. Donut chart decomposição % (igual concorrente)
2. Snapshot persistido no save do projeto + colunas novas DB
3. Hierarquia visual: 2 BIG cards no lugar de 8 flat

### P2 (Features novas depois da estabilização):
1. Parser de 3MF / paste do summary Bambu Studio → auto-popula 4 filamentos
2. Stepper/Wizard de inputs (reduz carga cognitiva)
