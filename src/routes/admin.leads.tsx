import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Phone, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { listSnapshot } from "@/lib/api/data.functions";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — Kurti 3D" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const leads = snap.data?.leads ?? [];
  const [search, setSearch] = useState("");

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
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {lead.mensagem || <em className="text-muted-foreground/50">Sem mensagem</em>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
