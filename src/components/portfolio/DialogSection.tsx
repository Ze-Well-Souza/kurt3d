import type { ComponentType } from "react";

/**
 * Bloco com icone + rotulo usado para agrupar campos dentro de formularios
 * longos (mesmo padrao visual ja usado na Calculadora e em Configuracoes).
 */
export function DialogSection({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/60 bg-muted/20 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}
