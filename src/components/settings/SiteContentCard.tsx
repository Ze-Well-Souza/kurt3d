import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSiteContent, saveSiteContent } from "@/lib/api/auth.functions";
import type { SiteContent } from "@/lib/domain/types";
import { DEFAULT_SITE_CONTENT } from "@/lib/domain/types";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { invalidarPor } from "@/lib/query-keys";

export function SiteContentCard() {
  const qc = useQueryClient();
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const [form, setForm] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [dirty, setDirty] = useState(false);

  // Sync form when data loads
  useEffect(() => {
    if (contentQ.data && !dirty) {
      setForm(contentQ.data);
    }
  }, [contentQ.data, dirty]);

  const handleSaveError = useToastErrorHandler({
    fallbackMessage: "Erro ao salvar conteúdo do site.",
  });

  const mutate = useMutation({
    mutationFn: () => saveSiteContent({ data: form }),
    onSuccess: () => {
      invalidarPor(qc, "salvarConteudoSite");
      setDirty(false);
      toast.success("Conteúdo do site salvo.");
    },
    onError: handleSaveError,
  });

  function set<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-semibold tracking-tight">
              Conteúdo do Site
            </h2>
          </div>
          <Button
            size="sm"
            className="btn-filament gap-2"
            disabled={mutate.isPending || !dirty}
            onClick={() => mutate.mutate()}
          >
            <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Edite os textos e links exibidos na landing page.
        </p>
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium">Título do Hero</Label>
          <Input
            value={form.heroTitulo}
            onChange={(e) => set("heroTitulo", e.target.value)}
            placeholder="Rápido. Colorido.\nPerfeito."
          />
          <p className="text-[11px] text-muted-foreground">
            Use \n para quebra de linha. Linha 2 recebe gradiente colorido.
          </p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium">Subtítulo do Hero</Label>
          <Input
            value={form.heroSubtitulo}
            onChange={(e) => set("heroSubtitulo", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Instagram URL</Label>
          <Input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">YouTube URL</Label>
          <Input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} />
        </div>
        {form.heroStats.map((s, i) => (
          <div key={i} className="space-y-1.5">
            <Label className="text-sm font-medium">Stat {i + 1}: Valor</Label>
            <Input
              value={s.valor}
              onChange={(e) => {
                const next = [...form.heroStats];
                next[i] = { ...next[i], valor: e.target.value };
                set("heroStats", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Label</Label>
            <Input
              value={s.label}
              onChange={(e) => {
                const next = [...form.heroStats];
                next[i] = { ...next[i], label: e.target.value };
                set("heroStats", next);
              }}
            />
          </div>
        ))}
        {form.features.map((f, i) => (
          <div key={i} className="space-y-1.5 sm:col-span-2">
            <Label className="text-sm font-medium">Feature {i + 1}: Título</Label>
            <Input
              value={f.titulo}
              onChange={(e) => {
                const next = [...form.features];
                next[i] = { ...next[i], titulo: e.target.value };
                set("features", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Descrição</Label>
            <Input
              value={f.descricao}
              onChange={(e) => {
                const next = [...form.features];
                next[i] = { ...next[i], descricao: e.target.value };
                set("features", next);
              }}
            />
          </div>
        ))}
        {form.testimonials.map((testimonial, i) => (
          <div key={i} className="space-y-1.5 sm:col-span-2 rounded-xl border border-border/70 p-4">
            <Label className="text-sm font-medium">Depoimento {i + 1}: Nome</Label>
            <Input
              value={testimonial.nome}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], nome: e.target.value };
                set("testimonials", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Cargo / contexto</Label>
            <Input
              value={testimonial.cargo}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], cargo: e.target.value };
                set("testimonials", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Texto</Label>
            <Textarea
              rows={3}
              value={testimonial.texto}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], texto: e.target.value };
                set("testimonials", next);
              }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
