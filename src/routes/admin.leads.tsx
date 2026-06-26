import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Phone, Calendar, Search, ExternalLink, Image as ImageIcon, UserPlus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { convertLeadToClient, listSnapshot } from "@/lib/api/data.functions";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — Kurti 3D" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const leads = snap.data?.leads ?? [];
  const clients = snap.data?.clients ?? [];
  const [search, setSearch] = useState("");

  const mutateConvertLead = useMutation({
    mutationFn: (leadId: string) => convertLeadToClient({ data: { leadId } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success(result.created ? "Lead convertido em cliente." : "Lead vinculado a cliente existente.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao converter lead.");
    },
  });

  function normalizeText(value?: string | null) {
    return (value ?? "").trim().toLowerCase();
  }

  function normalizePhone(value?: string | null) {
    return (value ?? "").replace(/\D/g, "");
  }

  function findLinkedClient(lead: (typeof leads)[number]) {
    const leadPhone = normalizePhone(lead.whatsapp);
    const leadName = normalizeText(lead.nome);
    return clients.find((client) => {
      const samePhone = leadPhone && normalizePhone(client.whatsapp) === leadPhone;
      const sameName = normalizeText(client.nome) === leadName;
      return samePhone || sameName;
    });
  }

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.nome.toLowerCase().includes(q) ||
      l.whatsapp.includes(q) ||
      l.mensagem.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Contatos recebidos pelo formulário do site ({leads.length} total)
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou mensagem…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-[280px] pl-9"
          />
        </div>
      </div>

      {snap.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!snap.isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum lead encontrado</p>
            <p className="text-sm text-muted-foreground">
              Os leads aparecerão aqui quando visitantes preencherem o formulário de contato no site.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {filtered.map((lead) => (
          <Card key={lead.id}>
            {(() => {
              const linkedClient = findLinkedClient(lead);
              return (
                <>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{lead.nome}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <a
                      href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {lead.whatsapp}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {linkedClient ? (
                    <Badge variant="outline" className="gap-1 text-xs text-green-700 border-green-600/30 bg-green-50">
                      <CheckCircle2 className="h-3 w-3" />
                      Convertido
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={mutateConvertLead.isPending}
                      onClick={() => mutateConvertLead.mutate(lead.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Converter em Cliente
                    </Button>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {linkedClient && (
                <div className="rounded-md border border-green-600/20 bg-green-50 px-3 py-2 text-xs text-green-700">
                  Cliente vinculado: <strong>{linkedClient.nome}</strong>
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {lead.mensagem || <em className="text-muted-foreground/50">Sem mensagem</em>}
              </p>
              {lead.linkProjeto && (
                <div className="flex items-center gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                  <a
                    href={lead.linkProjeto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    {lead.linkProjeto}
                  </a>
                </div>
              )}
              {lead.imagens && lead.imagens.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {lead.imagens.length} imagem(ns) anexada(s)
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {lead.imagens.map((img, idx) => (
                      <a
                        key={idx}
                        href={img.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={img.nome}
                        className="group relative block aspect-square overflow-hidden rounded-md border border-border bg-muted"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.nome}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
                </>
              );
            })()}
          </Card>
        ))}
      </div>
    </div>
  );
}
