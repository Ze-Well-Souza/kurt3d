# Design Document: Melhorias Calculadora e Portfólio Kurti 3D

## Visão Geral

Este documento especifica o design técnico detalhado para implementação das melhorias no sistema Kurti 3D, focando em três áreas principais:

1. **Controle de Visibilidade de Projetos**: Adição de campos `is_public` e `published_at` para gerenciar quais projetos aparecem na landing page pública
2. **Interface de Tempo Separada**: Campos individuais para horas e minutos com conversão automática para minutos totais
3. **Três Botões de Ação Pós-Cálculo**: "Salvar Privado", "Salvar e Publicar no Site", e "Criar Pedido"

As melhorias mantêm compatibilidade com a stack atual (TanStack Start, React 19, Supabase, TypeScript, Zod) e seguem os padrões estabelecidos no projeto.

## Arquitetura do Sistema

### Stack Técnica

- **Frontend**: TanStack Start + React 19
- **Backend**: TanStack Start Server Functions
- **Database**: Supabase (PostgreSQL)
- **Validação**: Zod schemas
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query (React Query)

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    admin.portfolio.tsx                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Calculator Form Component                             │  │
│  │  • Campos separados: hoursInput, minutesInput          │  │
│  │  • Preview: "Xh Ymin"                                  │  │
│  │  • Conversão: totalMin = hours * 60 + minutes          │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                  │
│                            ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Action Buttons Component                              │  │
│  │  • "Salvar Privado" (outline, Lock icon)              │  │
│  │  • "Salvar e Publicar no Site" (secondary, Globe)     │  │
│  │  • "Criar Pedido" (primary, ShoppingCart)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    portfolio.functions.ts              │
        │                                        │
        │  • addPortfolioProject()               │
        │  • updatePortfolioProject()            │
        │  • createOrderFromPortfolio()          │
        │                                        │
        │  Validação: portfolioProjectSchema     │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    Supabase PostgreSQL                 │
        │                                        │
        │  Table: portfolio_projects             │
        │  • is_public: boolean (default false)  │
        │  • published_at: timestamptz nullable  │
        │  • tempoMin: integer (minutos totais)  │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    Landing Page Query                  │
        │                                        │
        │  WHERE is_public = true                │
        │  ORDER BY published_at DESC NULLS LAST │
        └────────────────────────────────────────┘
```

## 1. Schema de Banco de Dados

### 1.1 Migração SQL

**Arquivo**: `migrations/add_portfolio_visibility.sql`

```sql
-- ================================================
-- Migration: Add visibility control to portfolio_projects
-- ================================================

BEGIN;

-- Add new columns for visibility control
ALTER TABLE portfolio_projects
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz NULL;

-- Migrate existing projects: make them public with published_at = created_at
UPDATE portfolio_projects
SET is_public = true,
    published_at = created_at
WHERE is_public IS NULL OR is_public = false;

-- Add indexes for performance
CREATE INDEX idx_portfolio_projects_is_public 
  ON portfolio_projects(is_public);

CREATE INDEX idx_portfolio_projects_published_at 
  ON portfolio_projects(published_at DESC NULLS LAST)
  WHERE is_public = true;

-- Add comment for documentation
COMMENT ON COLUMN portfolio_projects.is_public IS 
  'Controls whether project appears on public landing page';

COMMENT ON COLUMN portfolio_projects.published_at IS 
  'Timestamp when project was first published. Preserved when toggling to private.';

COMMIT;
```

### 1.2 Schema Atualizado do Tipo `PortfolioProject`

**Arquivo**: `src/lib/domain/types.ts`

```typescript
export type PortfolioProject = {
  id: string;
  nome: string;
  categoria: string;
  linkModelo?: string;
  filamentoId?: string;
  custoRolo: number;
  pesoRolo: number;
  pesoPeca: number;
  tempoMin: number;  // Stored in total minutes
  quantidade: number;
  precoVenda: number;
  perdaPercent?: number;
  
  // NEW: Visibility control
  isPublic: boolean;  // Default: false
  publishedAt?: string | null;  // ISO timestamp
  
  // Multi-filament + cost fields (existing)
  filamentos?: CalculatorFilamentoInput[];
  custosExtras?: CalculatorExtraCost[];
  custoKwh?: number | null;
  custoKwOverride?: number | null;
  custoTrabalhoHoras?: number | null;
  custoTrabalhoValorHora?: number | null;
  taxaGateway?: number | null;
  
  createdAt: string;
  updatedAt: string;
};
```

## 2. Validação Zod

### 2.1 Schema de Tempo de Impressão

**Arquivo**: `src/lib/schemas/time-input.schema.ts`

```typescript
import { z } from "zod";

/**
 * Schema for separated time input (hours + minutes)
 */
export const timeInputSchema = z.object({
  hours: z.number()
    .int("Horas deve ser um número inteiro")
    .min(0, "Horas não pode ser negativo")
    .max(999, "Máximo 999 horas"),
  
  minutes: z.number()
    .int("Minutos deve ser um número inteiro")
    .min(0, "Minutos não pode ser negativo")
    .max(59, "Minutos deve estar entre 0 e 59"),
}).refine(
  (data) => data.hours > 0 || data.minutes > 0,
  {
    message: "Informe pelo menos 1 minuto de impressão",
    path: ["minutes"],
  }
);

/**
 * Convert hours and minutes to total minutes
 */
export function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Convert total minutes to hours and minutes
 */
export function minutesToTime(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

/**
 * Format time for display: "Xh Ymin"
 */
export function formatTimePreview(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return "0min";
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
```


### 2.2 Schema Atualizado de Projeto de Portfólio

**Arquivo**: `src/lib/api/functions/portfolio.functions.ts` (atualizar validação)

```typescript
const portfolioProjectSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(100),
  categoria: z.string().trim().min(1).max(50),
  linkModelo: z.string().url("URL inválida").or(z.literal("")).optional(),
  
  // Time stored as total minutes
  tempoMin: z.number()
    .int()
    .min(1, "Informe pelo menos 1 minuto de impressão")
    .max(100000),
  
  // NEW: Visibility fields
  isPublic: z.boolean().default(false),
  publishedAt: z.string().datetime().nullable().optional(),
  
  // Existing fields...
  custoRolo: z.number().min(0.01).max(100000),
  pesoRolo: z.number().min(1).max(100000),
  pesoPeca: z.number().min(0.1).max(100000),
  quantidade: z.number().int().min(1).max(100000),
  precoVenda: z.number().min(0).max(1000000),
  perdaPercent: z.number().min(0).max(100).optional(),
  
  filamentos: z.array(calculatorFilamentoItemSchema).optional(),
  custosExtras: z.array(calculatorExtraCostSchema).optional(),
  custoKwh: z.number().min(0).nullable().optional(),
  custoKwOverride: z.number().min(0).nullable().optional(),
  custoTrabalhoHoras: z.number().min(0).nullable().optional(),
  custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
  taxaGateway: z.number().min(0).max(100).nullable().optional(),
});
```

## 3. Componentes React

### 3.1 Time Input Component

**Arquivo**: `src/components/portfolio/TimeInput.tsx`

```typescript
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimePreview, minutesToTime, timeToMinutes } from "@/lib/schemas/time-input.schema";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  totalMinutes: number;
  onChange: (minutes: number) => void;
  error?: string;
  disabled?: boolean;
}

export function TimeInput({ totalMinutes, onChange, error, disabled }: TimeInputProps) {
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");

  // Initialize from totalMinutes
  useEffect(() => {
    const { hours: h, minutes: m } = minutesToTime(totalMinutes);
    setHours(h.toString());
    setMinutes(m.toString());
  }, [totalMinutes]);

  const handleHoursChange = (value: string) => {
    const parsed = parseInt(value) || 0;
    if (parsed >= 0 && parsed <= 999) {
      setHours(value);
      const mins = parseInt(minutes) || 0;
      onChange(timeToMinutes(parsed, mins));
    }
  };

  const handleMinutesChange = (value: string) => {
    const parsed = parseInt(value) || 0;
    if (parsed >= 0 && parsed <= 59) {
      setMinutes(value);
      const hrs = parseInt(hours) || 0;
      onChange(timeToMinutes(hrs, parsed));
    }
  };

  const preview = formatTimePreview(
    parseInt(hours) || 0,
    parseInt(minutes) || 0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Tempo de Impressão</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Informe o tempo estimado de impressão</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Label htmlFor="hours" className="text-xs text-muted-foreground">
            Horas
          </Label>
          <Input
            id="hours"
            type="number"
            min="0"
            max="999"
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            disabled={disabled}
            className={cn(error && "border-red-500")}
            placeholder="0"
          />
        </div>

        <div className="flex-1">
          <Label htmlFor="minutes" className="text-xs text-muted-foreground">
            Minutos
          </Label>
          <Input
            id="minutes"
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            disabled={disabled}
            className={cn(error && "border-red-500")}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tempo total: <span className="font-medium">{preview}</span>
        </p>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
```


### 3.2 Action Buttons Component

**Arquivo**: `src/components/portfolio/ActionButtons.tsx`

```typescript
import { Lock, Globe, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ProjectAction = "save-private" | "save-publish" | "create-order";

interface ActionButtonsProps {
  onAction: (action: ProjectAction) => void;
  disabled: boolean;
  loading: boolean;
}

export function ActionButtons({ onAction, disabled, loading }: ActionButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => onAction("save-private")}
              disabled={disabled || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Salvar Privado
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Salvar projeto sem publicar no site</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAction("save-publish")}
              disabled={disabled || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Salvar e Publicar no Site
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Salvar e exibir no portfólio público</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => onAction("create-order")}
              disabled={disabled || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              Criar Pedido
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Salvar projeto e criar pedido imediatamente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### 3.3 Visibility Badge Component

**Arquivo**: `src/components/portfolio/VisibilityBadge.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { Globe, Lock } from "lucide-react";

interface VisibilityBadgeProps {
  isPublic: boolean;
  className?: string;
}

export function VisibilityBadge({ isPublic, className }: VisibilityBadgeProps) {
  return (
    <Badge
      variant={isPublic ? "default" : "secondary"}
      className={className}
    >
      {isPublic ? (
        <>
          <Globe className="mr-1 h-3 w-3" />
          Público
        </>
      ) : (
        <>
          <Lock className="mr-1 h-3 w-3" />
          Privado
        </>
      )}
    </Badge>
  );
}
```

## 4. Server Functions (API)

### 4.1 Atualizar `addPortfolioProject`

**Arquivo**: `src/lib/api/functions/portfolio.functions.ts`

```typescript
export const addPortfolioProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1).max(100),
      categoria: z.string().trim().min(1).max(50),
      linkModelo: z.string().url().optional(),
      filamentoId: z.string().min(1).optional(),
      custoRolo: z.number().min(0.01).max(100000),
      pesoRolo: z.number().min(1).max(100000),
      pesoPeca: z.number().min(0.1).max(100000),
      tempoMin: z.number().int().min(1).max(100000), // Total minutes
      quantidade: z.number().int().min(1).max(100000),
      precoVenda: z.number().min(0).max(1000000),
      perdaPercent: z.number().min(0).max(100).optional(),
      
      // NEW: Visibility control
      isPublic: z.boolean().default(false),
      
      // Existing multi-filament fields
      filamentos: z.array(calculatorFilamentoItemSchema).optional(),
      custosExtras: z.array(calculatorExtraCostSchema).optional(),
      custoKwh: z.number().min(0).nullable().optional(),
      custoKwOverride: z.number().min(0).nullable().optional(),
      custoTrabalhoHoras: z.number().min(0).nullable().optional(),
      custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
      taxaGateway: z.number().min(0).max(100).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioRepo();
    const now = nowIso();
    
    const project: PortfolioProject = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      nome: data.nome,
      categoria: data.categoria,
      linkModelo: data.linkModelo,
      filamentoId: data.filamentoId,
      custoRolo: data.custoRolo,
      pesoRolo: data.pesoRolo,
      pesoPeca: data.pesoPeca,
      tempoMin: data.tempoMin, // Already in total minutes
      quantidade: data.quantidade,
      precoVenda: data.precoVenda,
      perdaPercent: data.perdaPercent ?? 0,
      
      // NEW: Visibility control
      isPublic: data.isPublic,
      publishedAt: data.isPublic ? now : null, // Auto-set when public
      
      filamentos: data.filamentos,
      custosExtras: data.custosExtras,
      custoKwh: data.custoKwh ?? null,
      custoKwOverride: data.custoKwOverride ?? null,
      custoTrabalhoHoras: data.custoTrabalhoHoras ?? null,
      custoTrabalhoValorHora: data.custoTrabalhoValorHora ?? null,
      taxaGateway: data.taxaGateway ?? null,
    };
    
    await repo.save([project, ...repo.list]);
    return { ok: true, projectId: project.id };
  });
```


### 4.2 Atualizar `updatePortfolioProject`

**Arquivo**: `src/lib/api/functions/portfolio.functions.ts`

```typescript
export const updatePortfolioProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      nome: z.string().trim().min(1).max(200),
      categoria: z.string().trim().min(1).max(200),
      linkModelo: z.string().max(2000).nullable(),
      filamentoId: z.string().min(1).nullable(),
      custoRolo: z.number().min(0.01),
      pesoRolo: z.number().min(1),
      pesoPeca: z.number().min(0.01),
      tempoMin: z.number().int().min(1),
      quantidade: z.number().int().min(1),
      precoVenda: z.number().min(0.01),
      perdaPercent: z.number().min(0).max(100).nullable(),
      
      // NEW: Visibility control
      isPublic: z.boolean(),
      
      filamentos: z.array(calculatorFilamentoItemSchema).optional(),
      custosExtras: z.array(calculatorExtraCostSchema).optional(),
      custoKwh: z.number().min(0).nullable().optional(),
      custoKwOverride: z.number().min(0).nullable().optional(),
      custoTrabalhoHoras: z.number().min(0).nullable().optional(),
      custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
      taxaGateway: z.number().min(0).max(100).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const portfolio = await portfolioRepo();
    const project = portfolio.list.find((item) => item.id === data.id);
    if (!project) return { ok: false as const, reason: "not_found" as const };

    const now = nowIso();
    
    // Handle publishedAt logic:
    // - If transitioning to public (was private, now public): set new publishedAt
    // - If staying public: keep existing publishedAt
    // - If transitioning to private: keep existing publishedAt (history)
    let publishedAt = project.publishedAt;
    if (data.isPublic && !project.isPublic) {
      // Transitioning from private to public
      publishedAt = now;
    } else if (data.isPublic && !publishedAt) {
      // Public but no publishedAt (shouldn't happen, but defensive)
      publishedAt = now;
    }
    // If going private, keep existing publishedAt
    
    const updated: PortfolioProject = {
      ...project,
      nome: data.nome,
      categoria: data.categoria,
      linkModelo: data.linkModelo ?? undefined,
      filamentoId: data.filamentoId ?? undefined,
      custoRolo: data.custoRolo,
      pesoRolo: data.pesoRolo,
      pesoPeca: data.pesoPeca,
      tempoMin: data.tempoMin,
      quantidade: data.quantidade,
      precoVenda: data.precoVenda,
      perdaPercent: data.perdaPercent ?? 0,
      
      // NEW: Update visibility
      isPublic: data.isPublic,
      publishedAt,
      
      filamentos: data.filamentos,
      custosExtras: data.custosExtras,
      custoKwh: data.custoKwh ?? null,
      custoKwOverride: data.custoKwOverride ?? null,
      custoTrabalhoHoras: data.custoTrabalhoHoras ?? null,
      custoTrabalhoValorHora: data.custoTrabalhoValorHora ?? null,
      taxaGateway: data.taxaGateway ?? null,
      updatedAt: now,
    };
    
    await portfolio.save(portfolio.list.map((item) => (item.id === project.id ? updated : item)));
    return { ok: true as const };
  });
```

### 4.3 Nova Query: `listPublicPortfolio`

**Arquivo**: `src/lib/api/functions/portfolio.functions.ts`

```typescript
/**
 * List only public portfolio projects for landing page
 * Filters by is_public = true and orders by published_at DESC
 */
export const listPublicPortfolio = createServerFn({ method: "GET" })
  .handler(async () => {
    const repo = await portfolioRepo();
    
    // Filter public projects
    const publicProjects = repo.list.filter((project) => project.isPublic === true);
    
    // Sort by published_at DESC, nulls last
    publicProjects.sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0;
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    return publicProjects;
  });
```

## 5. Integração no Formulário Principal

### 5.1 Atualizar State do Formulário

**Arquivo**: `src/routes/admin.portfolio.tsx`

```typescript
type FormState = {
  // ... existing fields
  
  // REPLACE: tempoMin: string
  // WITH: Separated time inputs
  timeHours: string;
  timeMinutes: string;
  
  // ... existing fields
};

const initialForm: FormState = {
  // ... existing initial values
  timeHours: "0",
  timeMinutes: "0",
  // ... existing initial values
};
```

### 5.2 Handlers para Ações

**Arquivo**: `src/routes/admin.portfolio.tsx`

```typescript
async function handleProjectAction(action: ProjectAction) {
  try {
    // Validate form
    const hours = Number(form.timeHours) || 0;
    const minutes = Number(form.timeMinutes) || 0;
    const totalMinutes = timeToMinutes(hours, minutes);
    
    if (totalMinutes < 1) {
      toast.error("Informe pelo menos 1 minuto de impressão");
      return;
    }
    
    const projectData = {
      nome: form.nome,
      categoria: form.categoria,
      linkModelo: form.linkModelo || undefined,
      filamentoId: form.filamentoId || undefined,
      custoRolo: Number(form.custoRolo),
      pesoRolo: Number(form.pesoRolo),
      pesoPeca: Number(form.pesoPeca),
      tempoMin: totalMinutes,
      quantidade: Number(form.quantidade),
      precoVenda: Number(form.precoVenda),
      perdaPercent: Number(form.perdaPercent) || 0,
      isPublic: action === "save-publish", // true only for publish action
      filamentos: form.filamentos,
      custosExtras: form.custosExtras,
      custoKwh: Number(form.custoKwh) || null,
      custoKwOverride: Number(form.custoKwOverride) || null,
      custoTrabalhoHoras: Number(form.custoTrabalhoHoras) || null,
      custoTrabalhoValorHora: Number(form.custoTrabalhoValorHora) || null,
      taxaGateway: Number(form.taxaGateway) || null,
    };
    
    // Save project
    const result = await mutateAddProject.mutateAsync(projectData);
    
    // Action-specific behavior
    if (action === "save-private") {
      toast.success("Projeto salvo como privado");
      resetForm();
    } else if (action === "save-publish") {
      toast.success("Projeto publicado no site");
      resetForm();
    } else if (action === "create-order") {
      toast.success("Projeto salvo. Criando pedido...");
      setOrderDialog({
        open: true,
        projectId: result.projectId,
        client: "",
        clientId: "",
        quantity: "1",
      });
    }
  } catch (error) {
    toast.error(
      error instanceof Error 
        ? error.message 
        : "Erro ao salvar projeto"
    );
  }
}
```


## 6. Fluxos de Dados Detalhados

### 6.1 Fluxo: Salvar Projeto Privado

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Salvar Privado"                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleProjectAction("save-private")                          │
│    • Validate timeHours, timeMinutes                            │
│    • Convert to totalMinutes                                    │
│    • Set isPublic = false                                       │
│    • publishedAt = null                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. mutateAddProject.mutateAsync()                               │
│    • Server validation via Zod                                  │
│    • Create PortfolioProject object                             │
│    • Save to repository                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Success Response                                             │
│    • toast.success("Projeto salvo como privado")                │
│    • invalidatePortfolio() - refresh list                       │
│    • resetForm()                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Fluxo: Salvar e Publicar

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Salvar e Publicar no Site"                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleProjectAction("save-publish")                          │
│    • Validate form                                              │
│    • Convert time to totalMinutes                               │
│    • Set isPublic = true                                        │
│    • publishedAt will be auto-set by server to nowIso()         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. mutateAddProject.mutateAsync()                               │
│    • Server sets publishedAt = nowIso() when isPublic = true    │
│    • Save to repository                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Success Response                                             │
│    • toast.success("Projeto publicado no site")                 │
│    • invalidatePortfolio()                                      │
│    • Project now visible on landing page                        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Fluxo: Criar Pedido

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Criar Pedido"                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleProjectAction("create-order")                          │
│    • Validate form                                              │
│    • Set isPublic = false (pedidos são privados por padrão)     │
│    • publishedAt = null                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. mutateAddProject.mutateAsync()                               │
│    • Save project as private                                    │
│    • Return projectId                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Open Order Dialog                                            │
│    • setOrderDialog({ open: true, projectId, ... })            │
│    • Pre-fill order form with project data                      │
│    • User completes client info                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. createOrderFromPortfolio()                                   │
│    • Create Order linked to PortfolioProject                    │
│    • Order status = "todo"                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Fluxo: Editar e Alterar Visibilidade

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User opens existing project for edit                         │
│    • Load project data                                          │
│    • Convert totalMinutes back to hours and minutes             │
│    • Display VisibilityBadge (Público/Privado)                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. User modifies data and selects action                        │
│    • Can toggle visibility via action buttons                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. handleProjectUpdate(action)                                  │
│    • Validate form                                              │
│    • Set isPublic based on action                               │
│    • publishedAt logic:                                         │
│      - Private → Public: set new publishedAt                    │
│      - Public → Public: keep existing publishedAt               │
│      - Public → Private: keep existing publishedAt (history)    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. mutateUpdateProject.mutateAsync()                            │
│    • Server applies publishedAt logic                           │
│    • Update repository                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Success Response                                             │
│    • toast.success("Projeto atualizado")                        │
│    • invalidatePortfolio()                                      │
│    • Landing page reflects new visibility immediately           │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Tratamento de Erros e Validações

### 7.1 Validações no Frontend

```typescript
// Time validation
if (hours < 0 || hours > 999) {
  setError("Horas deve estar entre 0 e 999");
  return;
}

if (minutes < 0 || minutes > 59) {
  setError("Minutos deve estar entre 0 e 59");
  return;
}

const totalMinutes = timeToMinutes(hours, minutes);
if (totalMinutes < 1) {
  setError("Informe pelo menos 1 minuto de impressão");
  return;
}

// Required fields
if (!form.nome.trim()) {
  setError("Informe o nome do projeto");
  return;
}

if (!form.categoria) {
  setError("Selecione uma categoria");
  return;
}

// Numeric validations
if (Number(form.pesoPeca) <= 0) {
  setError("Peso da peça deve ser maior que zero");
  return;
}
```

### 7.2 Validações no Backend

```typescript
// Server-side validation via Zod
const schema = z.object({
  tempoMin: z.number()
    .int("Tempo deve ser um número inteiro de minutos")
    .min(1, "Informe pelo menos 1 minuto de impressão")
    .max(100000, "Tempo máximo excedido"),
  
  isPublic: z.boolean(),
  
  publishedAt: z.string()
    .datetime()
    .nullable()
    .optional(),
});

// Additional business logic validation
if (data.isPublic && !data.publishedAt) {
  // Auto-set publishedAt when public
  data.publishedAt = nowIso();
}
```


### 7.3 Mensagens de Erro Amigáveis

```typescript
const ERROR_MESSAGES = {
  // Time errors
  TIME_REQUIRED: "Informe pelo menos 1 minuto de impressão",
  TIME_HOURS_INVALID: "Horas deve estar entre 0 e 999",
  TIME_MINUTES_INVALID: "Minutos deve estar entre 0 e 59",
  
  // Field errors
  NAME_REQUIRED: "Informe o nome do projeto",
  CATEGORY_REQUIRED: "Selecione uma categoria",
  WEIGHT_INVALID: "Peso da peça inválido",
  COST_INVALID: "Custo inválido",
  
  // Save errors
  SAVE_FAILED: "Erro ao salvar projeto. Tente novamente.",
  NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
  
  // Success messages
  SAVED_PRIVATE: "Projeto salvo como privado",
  SAVED_PUBLIC: "Projeto publicado no site",
  ORDER_CREATED: "Pedido criado com sucesso",
  PROJECT_UPDATED: "Projeto atualizado",
};
```

## 8. Melhorias de Usabilidade

### 8.1 Keyboard Navigation

```typescript
// Form with proper tabIndex order
<form onKeyDown={handleFormKeyDown}>
  <Input id="nome" tabIndex={1} />
  <Select tabIndex={2} />
  <Input id="hours" tabIndex={3} />
  <Input id="minutes" tabIndex={4} />
  <Input id="pesoPeca" tabIndex={5} />
  {/* ... more fields ... */}
  
  <div className="action-buttons" tabIndex={6}>
    {/* Focus on primary button when Enter is pressed on last field */}
  </div>
</form>

function handleFormKeyDown(e: React.KeyboardEvent) {
  if (e.key === "Enter" && e.target === lastInputRef.current) {
    e.preventDefault();
    primaryButtonRef.current?.focus();
  }
}
```

### 8.2 Form State Preservation

```typescript
// Save form state to sessionStorage
useEffect(() => {
  const saveFormState = () => {
    sessionStorage.setItem(
      "portfolio-calculator-draft",
      JSON.stringify(form)
    );
  };
  
  // Debounce to avoid excessive writes
  const timeoutId = setTimeout(saveFormState, 1000);
  return () => clearTimeout(timeoutId);
}, [form]);

// Restore on mount
useEffect(() => {
  const saved = sessionStorage.getItem("portfolio-calculator-draft");
  if (saved) {
    try {
      const draft = JSON.parse(saved);
      setForm(draft);
      toast.info("Rascunho restaurado");
    } catch (error) {
      console.error("Failed to restore draft:", error);
    }
  }
}, []);
```

### 8.3 Character Counter

```typescript
interface CharCounterInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  label: string;
}

function CharCounterInput({ value, onChange, maxLength, label }: CharCounterInputProps) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 10;
  
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
      <p className={cn(
        "text-xs text-muted-foreground mt-1",
        isNearLimit && "text-orange-600 font-medium"
      )}>
        {remaining} caracteres restantes
      </p>
    </div>
  );
}
```

## 9. Performance e Otimizações

### 9.1 Query Optimization

```sql
-- Index for public portfolio queries
CREATE INDEX idx_portfolio_projects_is_public 
  ON portfolio_projects(is_public);

-- Composite index for sorting
CREATE INDEX idx_portfolio_projects_published_at 
  ON portfolio_projects(published_at DESC NULLS LAST)
  WHERE is_public = true;

-- Explain plan for public query
EXPLAIN ANALYZE
SELECT * FROM portfolio_projects
WHERE is_public = true
ORDER BY published_at DESC NULLS LAST;
```

### 9.2 React Query Configuration

```typescript
// Optimistic updates for better UX
const mutateUpdateVisibility = useMutation({
  mutationFn: updatePortfolioProject,
  
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["portfolio"] });
    
    // Snapshot current value
    const previous = queryClient.getQueryData(["portfolio"]);
    
    // Optimistically update
    queryClient.setQueryData(["portfolio"], (old: PortfolioProject[]) => {
      return old.map((p) =>
        p.id === variables.id
          ? { ...p, isPublic: variables.isPublic, updatedAt: new Date().toISOString() }
          : p
      );
    });
    
    return { previous };
  },
  
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(["portfolio"], context.previous);
    }
    toast.error("Erro ao atualizar visibilidade");
  },
  
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  },
});
```

### 9.3 Debouncing and Throttling

```typescript
// Debounce time input changes
const debouncedTimeChange = useMemo(
  () =>
    debounce((hours: number, minutes: number) => {
      const total = timeToMinutes(hours, minutes);
      setField("tempoMin", total);
    }, 300),
  []
);

// Throttle preview updates
const throttledPreviewUpdate = useMemo(
  () =>
    throttle(() => {
      updatePreview();
    }, 100),
  []
);
```


## 10. Testes e Qualidade

### 10.1 Unit Tests

```typescript
// time-input.schema.test.ts
import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, formatTimePreview } from "./time-input.schema";

describe("timeToMinutes", () => {
  it("converts hours and minutes to total minutes", () => {
    expect(timeToMinutes(2, 30)).toBe(150);
    expect(timeToMinutes(0, 45)).toBe(45);
    expect(timeToMinutes(5, 0)).toBe(300);
  });
});

describe("minutesToTime", () => {
  it("converts total minutes to hours and minutes", () => {
    expect(minutesToTime(150)).toEqual({ hours: 2, minutes: 30 });
    expect(minutesToTime(45)).toEqual({ hours: 0, minutes: 45 });
    expect(minutesToTime(300)).toEqual({ hours: 5, minutes: 0 });
  });
  
  it("handles round-trip conversion", () => {
    const original = { hours: 3, minutes: 27 };
    const total = timeToMinutes(original.hours, original.minutes);
    const result = minutesToTime(total);
    expect(result).toEqual(original);
  });
});

describe("formatTimePreview", () => {
  it("formats time correctly", () => {
    expect(formatTimePreview(0, 0)).toBe("0min");
    expect(formatTimePreview(0, 30)).toBe("30min");
    expect(formatTimePreview(2, 0)).toBe("2h");
    expect(formatTimePreview(2, 30)).toBe("2h 30min");
  });
});
```

### 10.2 Integration Tests

```typescript
// portfolio.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { addPortfolioProject, listPublicPortfolio } from "./portfolio.functions";

describe("Portfolio Visibility", () => {
  it("filters public projects correctly", async () => {
    // Create mix of public and private projects
    await addPortfolioProject({ isPublic: true, nome: "Public 1", /* ... */ });
    await addPortfolioProject({ isPublic: false, nome: "Private 1", /* ... */ });
    await addPortfolioProject({ isPublic: true, nome: "Public 2", /* ... */ });
    
    const publicProjects = await listPublicPortfolio();
    
    expect(publicProjects).toHaveLength(2);
    expect(publicProjects.every(p => p.isPublic)).toBe(true);
  });
  
  it("orders public projects by publishedAt DESC", async () => {
    const projects = await listPublicPortfolio();
    
    for (let i = 0; i < projects.length - 1; i++) {
      const current = new Date(projects[i].publishedAt!).getTime();
      const next = new Date(projects[i + 1].publishedAt!).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});
```

## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema — essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como a ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

### Property 1: Conversão de Tempo é Bijetiva (Round-Trip)

*Para qualquer* par de valores (horas, minutos) onde 0 ≤ horas ≤ 999 e 0 ≤ minutos ≤ 59, converter para minutos totais e depois de volta para (horas', minutos') deve resultar em horas × 60 + minutos = horas' × 60 + minutos'.

**Validates: Requirements 2.3, 2.7**

### Property 2: Validação de Tempo Mínimo

*Para qualquer* par de valores (horas, minutos), o sistema deve aceitar o input se e somente se horas > 0 OU minutos > 0.

**Validates: Requirements 2.6**

### Property 3: Projetos Privados Não Aparecem na Landing Page

*Para qualquer* conjunto de projetos de portfólio, a query `listPublicPortfolio()` deve retornar apenas projetos onde `is_public = true`.

**Validates: Requirements 1.5, 1.7**

### Property 4: Ordenação de Projetos Públicos

*Para qualquer* conjunto de projetos públicos retornados por `listPublicPortfolio()`, os projetos devem estar ordenados por `published_at` em ordem decrescente, com valores NULL no final.

**Validates: Requirements 1.6**

### Property 5: Salvamento Privado Define Campos Corretamente

*Para qualquer* projeto salvo via ação "Salvar Privado", o projeto resultante deve ter `is_public = false` e `published_at = null`.

**Validates: Requirements 1.3, 3.5**

### Property 6: Salvamento Público Define Timestamp

*Para qualquer* projeto salvo via ação "Salvar e Publicar no Site", o projeto resultante deve ter `is_public = true` e `published_at` deve ser um timestamp válido não nulo.

**Validates: Requirements 1.4, 3.6**

### Property 7: Transição de Privado para Público Define Novo Timestamp

*Para qualquer* projeto existente com `is_public = false` que é atualizado para `is_public = true`, o sistema deve definir um novo valor para `published_at` igual ao timestamp da atualização.

**Validates: Requirements 6.2**

### Property 8: Transição de Público para Privado Preserva Timestamp

*Para qualquer* projeto existente com `is_public = true` e `published_at` não nulo que é atualizado para `is_public = false`, o sistema deve preservar o valor existente de `published_at`.

**Validates: Requirements 6.3, 7.7**

### Property 9: Auto-preenchimento de Published_At

*Para qualquer* projeto com `is_public = true` e `published_at = null`, o sistema deve automaticamente definir `published_at` para o timestamp atual antes de persistir.

**Validates: Requirements 7.6**

### Property 10: Validação de Tipos de Visibilidade

*Para qualquer* tentativa de salvar um projeto, o sistema deve validar que `is_public` é um valor booleano e `published_at` é um timestamp válido ou NULL, rejeitando valores de outros tipos.

**Validates: Requirements 7.4, 7.5**

### Property 11: Formatação de Preview de Tempo

*Para qualquer* par de valores (horas, minutos) onde horas ≥ 0 e minutos ≥ 0, a função `formatTimePreview` deve retornar uma string contendo "h" quando horas > 0, "min" quando minutos > 0, ou "0min" quando ambos são zero.

**Validates: Requirements 2.8**

### Property 12: Feedback Visual de Validação

*Para qualquer* campo de formulário com erro de validação, o sistema deve exibir tanto uma borda vermelha quanto uma mensagem de erro específica, e deve remover ambos quando o campo for corrigido.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 13: Estado de Botões Durante Salvamento

*Para qualquer* operação de salvamento em progresso, todos os três botões de ação devem estar desabilitados e exibir indicador de carregamento, e devem ser reabilitados quando a operação concluir (sucesso ou erro).

**Validates: Requirements 3.9, 5.5**

### Property 14: Notificações de Feedback

*Para qualquer* ação de salvamento (privado, público, ou criar pedido), o sistema deve exibir uma notificação toast com mensagem específica correspondente à ação realizada.

**Validates: Requirements 3.8, 5.6**

### Property 15: Deleção Remove de Landing Page

*Para qualquer* projeto público que é deletado, o projeto não deve mais aparecer em nenhuma query subsequente de `listPublicPortfolio()`.

**Validates: Requirements 6.5**

### Property 16: Preservação de Estado do Formulário

*Para qualquer* estado válido do formulário, se o usuário navegar para outra tela e retornar dentro da mesma sessão, os dados do formulário devem ser restaurados para o estado anterior.

**Validates: Requirements 8.6**


## 11. Migração e Rollout

### 11.1 Plano de Migração

**Fase 1: Preparação do Schema**

```sql
-- Executar em ambiente de desenvolvimento primeiro
-- Arquivo: migrations/001_add_visibility_fields.sql

BEGIN;

-- 1. Add columns with defaults
ALTER TABLE portfolio_projects
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz NULL;

-- 2. Backup existing data
CREATE TABLE portfolio_projects_backup_20240101 AS
SELECT * FROM portfolio_projects;

-- 3. Migrate existing projects to public
UPDATE portfolio_projects
SET is_public = true,
    published_at = created_at
WHERE TRUE;

-- 4. Add indexes
CREATE INDEX idx_portfolio_projects_is_public 
  ON portfolio_projects(is_public);

CREATE INDEX idx_portfolio_projects_published_at 
  ON portfolio_projects(published_at DESC NULLS LAST)
  WHERE is_public = true;

-- 5. Verify migration
DO $$
DECLARE
  migrated_count INT;
  public_count INT;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM portfolio_projects;
  SELECT COUNT(*) INTO public_count FROM portfolio_projects WHERE is_public = true;
  
  RAISE NOTICE 'Total projects: %', migrated_count;
  RAISE NOTICE 'Public projects: %', public_count;
  
  IF migrated_count != public_count THEN
    RAISE EXCEPTION 'Migration verification failed: not all projects are public';
  END IF;
END $$;

COMMIT;
```

**Fase 2: Deploy de Código**

1. Deploy server functions atualizadas (`portfolio.functions.ts`)
2. Deploy componentes React atualizados
3. Deploy landing page com query filtrada
4. Verificar logs e monitorar erros

**Fase 3: Validação Pós-Deploy**

```typescript
// Script de verificação: scripts/verify-portfolio-migration.ts
import { portfolioRepo } from "@/lib/server/repositories.server";

async function verifyMigration() {
  const repo = await portfolioRepo();
  const projects = repo.list;
  
  console.log(`Total projects: ${projects.length}`);
  
  const hasVisibilityFields = projects.every(
    (p) => typeof p.isPublic === "boolean" && 
           (p.publishedAt === null || typeof p.publishedAt === "string")
  );
  
  if (!hasVisibilityFields) {
    throw new Error("Some projects missing visibility fields");
  }
  
  const publicCount = projects.filter(p => p.isPublic).length;
  console.log(`Public projects: ${publicCount}`);
  console.log(`Private projects: ${projects.length - publicCount}`);
  
  // Verify all existing projects were migrated as public
  if (publicCount !== projects.length) {
    console.warn("Warning: Some projects are already private");
  }
  
  console.log("✓ Migration verification passed");
}

verifyMigration().catch(console.error);
```

### 11.2 Rollback Plan

Se necessário reverter a migração:

```sql
-- Rollback script: migrations/001_add_visibility_fields_rollback.sql

BEGIN;

-- Remove indexes
DROP INDEX IF EXISTS idx_portfolio_projects_is_public;
DROP INDEX IF EXISTS idx_portfolio_projects_published_at;

-- Remove columns
ALTER TABLE portfolio_projects
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS published_at;

-- Verify rollback
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'portfolio_projects'
  AND column_name IN ('is_public', 'published_at');
-- Should return 0 rows

COMMIT;
```

### 11.3 Monitoramento Pós-Deploy

**Métricas para Acompanhar:**

1. **Query Performance**: Tempo de resposta de `listPublicPortfolio()`
2. **Error Rate**: Taxa de erros em salvamento de projetos
3. **User Actions**: Distribuição de uso dos 3 botões de ação
4. **Visibility Distribution**: Proporção de projetos públicos vs privados

```typescript
// Analytics tracking
function trackProjectAction(action: ProjectAction, projectId: string) {
  analytics.track("Portfolio Project Action", {
    action,
    projectId,
    timestamp: new Date().toISOString(),
  });
}

function trackPublicProjectsCount() {
  const publicCount = projects.filter(p => p.isPublic).length;
  const totalCount = projects.length;
  
  analytics.track("Portfolio Visibility Stats", {
    publicCount,
    privateCount: totalCount - publicCount,
    publicPercentage: (publicCount / totalCount) * 100,
  });
}
```

## 12. Documentação para Usuários

### 12.1 Guia de Uso: Calculadora Atualizada

**Entrada de Tempo de Impressão**

1. Use os campos separados para inserir horas e minutos
2. O sistema mostra uma prévia do tempo total (ex: "2h 30min")
3. Valores permitidos:
   - Horas: 0 a 999
   - Minutos: 0 a 59
   - Pelo menos um dos campos deve ser maior que zero

**Salvando Projetos**

Após calcular os custos, você tem três opções:

1. **Salvar Privado** (ícone de cadeado)
   - Salva o projeto no portfólio interno
   - Não aparece no site público
   - Use para projetos em rascunho ou testes

2. **Salvar e Publicar no Site** (ícone de globo)
   - Salva o projeto E o torna visível na landing page
   - Visitantes do site poderão ver este projeto
   - Use para trabalhos finalizados que você quer exibir

3. **Criar Pedido** (ícone de carrinho)
   - Salva o projeto como privado
   - Abre imediatamente a tela de criação de pedido
   - Use quando um cliente já confirnou o projeto

**Editando Projetos Existentes**

- Projetos públicos mostram um badge "Público" (verde)
- Projetos privados mostram um badge "Privado" (cinza)
- Você pode alterar a visibilidade ao editar usando os mesmos botões de ação
- O histórico de publicação é preservado mesmo se tornar o projeto privado

### 12.2 FAQ

**P: O que acontece com meus projetos existentes após a atualização?**
R: Todos os projetos existentes serão automaticamente marcados como públicos, mantendo o portfólio atual visível no site.

**P: Posso mudar um projeto de público para privado depois?**
R: Sim, ao editar qualquer projeto você pode usar o botão "Salvar Privado" para remover do site público.

**P: Projetos privados aparecem em algum lugar?**
R: Sim, eles aparecem apenas no seu painel administrativo, não na landing page pública.

**P: O tempo de impressão mudou. Preciso re-cadastrar meus projetos?**
R: Não, o tempo continua salvo corretamente. Apenas a interface de entrada ficou mais intuitiva com campos separados.

**P: Posso criar um pedido de um projeto público?**
R: Sim, você pode criar pedidos a partir de qualquer projeto (público ou privado) através do botão "Criar Pedido".

## 13. Considerações de Segurança

### 13.1 Validação de Permissões

```typescript
// Todas as mutações já protegidas por requireSession()
export const addPortfolioProject = createServerFn({ method: "POST" })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    await checkMutationRateLimit(); // Proteção contra spam
    await requireSession(); // Apenas usuários autenticados
    
    // ... lógica de salvamento
  });
```

### 13.2 Sanitização de Dados

```typescript
// Zod já fornece sanitização básica
nome: z.string().trim().min(1).max(100), // Remove espaços, limita tamanho

// Links externos são validados como URLs
linkModelo: z.string().url("URL inválida").or(z.literal("")).optional(),
```

### 13.3 Rate Limiting

```typescript
// Já implementado via checkMutationRateLimit()
// Previne abuse de APIs de salvamento
await checkMutationRateLimit();
```

## 14. Arquivos a Serem Criados/Modificados

### Novos Arquivos

- `migrations/add_portfolio_visibility.sql`
- `src/lib/schemas/time-input.schema.ts`
- `src/components/portfolio/TimeInput.tsx`
- `src/components/portfolio/ActionButtons.tsx`
- `src/components/portfolio/VisibilityBadge.tsx`
- `src/lib/schemas/time-input.schema.test.ts`
- `src/lib/api/functions/portfolio.integration.test.ts`
- `scripts/verify-portfolio-migration.ts`

### Arquivos a Modificar

- `src/lib/domain/types.ts` (adicionar campos isPublic, publishedAt)
- `src/lib/api/functions/portfolio.functions.ts` (atualizar add/update, adicionar listPublicPortfolio)
- `src/routes/admin.portfolio.tsx` (integrar novos componentes, handlers de ação)
- Landing page route (usar listPublicPortfolio em vez de listPortfolio)

## 15. Checklist de Implementação

- [ ] **Schema de Banco de Dados**
  - [ ] Criar migration SQL
  - [ ] Testar migration em dev
  - [ ] Adicionar indexes
  - [ ] Executar migration em produção

- [ ] **Tipos TypeScript**
  - [ ] Atualizar `PortfolioProject` type
  - [ ] Criar schemas de validação Zod

- [ ] **Utilitários de Tempo**
  - [ ] Implementar `timeToMinutes`
  - [ ] Implementar `minutesToTime`
  - [ ] Implementar `formatTimePreview`
  - [ ] Escrever testes unitários

- [ ] **Componentes React**
  - [ ] Criar `TimeInput` component
  - [ ] Criar `ActionButtons` component
  - [ ] Criar `VisibilityBadge` component
  - [ ] Testar componentes isoladamente

- [ ] **Server Functions**
  - [ ] Atualizar `addPortfolioProject`
  - [ ] Atualizar `updatePortfolioProject`
  - [ ] Criar `listPublicPortfolio`
  - [ ] Testar endpoints

- [ ] **Integração no Formulário**
  - [ ] Atualizar state do formulário
  - [ ] Implementar handlers de ação
  - [ ] Integrar componentes novos
  - [ ] Adicionar validações

- [ ] **Landing Page**
  - [ ] Atualizar query para usar `listPublicPortfolio`
  - [ ] Testar filtro de visibilidade

- [ ] **Testes**
  - [ ] Testes unitários de conversão de tempo
  - [ ] Testes de integração de visibilidade
  - [ ] Testes de validação
  - [ ] Testes E2E de fluxos completos

- [ ] **Documentação**
  - [ ] Documentar API changes
  - [ ] Criar guia de usuário
  - [ ] Atualizar README

- [ ] **Deploy**
  - [ ] Deploy em staging
  - [ ] Executar migration
  - [ ] Verificação pós-deploy
  - [ ] Deploy em produção
  - [ ] Monitoramento

