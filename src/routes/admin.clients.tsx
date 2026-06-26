import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, ChevronDown, ChevronUp, Package, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/SearchInput";
import { addClient, updateClient, removeClient } from "@/lib/api/data.functions";
import type { Client, Order } from "@/lib/domain/types";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { normalizeText } from "@/lib/utils/normalization";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({ meta: [{ title: "Clientes — Kurti 3D" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const snap = useSnapshot();
  const clients = snap.data?.clients ?? [];
  const orders = snap.data?.orders ?? [];
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", notas: "" });

  const mutateAdd = useMutation({ mutationFn: (data: any) => addClient({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Cliente cadastrado."); setForm({ nome: "", whatsapp: "", email: "", notas: "" }); setShowForm(false); } });
  const mutateUpdate = useMutation({ mutationFn: (data: any) => updateClient({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Cliente atualizado."); setEditClient(null); } });
  const mutateRemove = useMutation({ mutationFn: (id: string) => removeClient({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Cliente removido."); setDeleteId(null); } });

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const s = normalizeText(search);
    return clients.filter((c) =>
      normalizeText(c.nome).includes(s) ||
      normalizeText(c.whatsapp).includes(s) ||
      normalizeText(c.email).includes(s)
    );
  }, [clients, search]);

  function clientOrders(client: Client): Order[] {
    return orders.filter((o) => o.clientId === client.id);
  }

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro e histórico de clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente..." />
          <Button onClick={() => setShowForm(true)} className="btn-filament gap-2"><Plus className="h-4 w-4" />Novo cliente</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="filament-top border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total de Clientes</div>
          <div className="mt-1 font-display text-2xl font-bold">{clients.length}</div>
        </Card>
        <Card className="filament-top border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Clientes com Pedidos</div>
          <div className="mt-1 font-display text-2xl font-bold">{clients.filter((c) => clientOrders(c).length > 0).length}</div>
        </Card>
        <Card className="filament-top border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pedidos Vinculados</div>
          <div className="mt-1 font-display text-2xl font-bold">{orders.filter((o) => o.clientId).length}</div>
        </Card>
      </div>

      {/* Client List */}
      {filtered.length === 0 ? (
        <Card className="filament-top border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{clients.length === 0 ? "Nenhum cliente cadastrado." : `Nenhum resultado para "${search}".`}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const cOrders = clientOrders(c);
            const totalGasto = cOrders.reduce((sum, o) => sum + (o.precoVenda ?? 0) * o.quantity, 0);
            const expanded = expandedId === c.id;
            return (
              <Card key={c.id} className="filament-top border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(expanded ? null : c.id)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#5fa8a3,#8a3a52)" }}>
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.nome}</span>
                      {cOrders.length > 0 && <Badge variant="secondary">{cOrders.length} pedidos</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {c.whatsapp && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.whatsapp}</span>}
                      {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                      {totalGasto > 0 && <span className="inline-flex items-center gap-1 filament-text font-medium"><DollarSign className="h-3 w-3" />{brl(totalGasto)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditClient(c); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    {c.notas && <p className="mb-3 text-xs text-muted-foreground"><span className="font-medium">Notas:</span> {c.notas}</p>}
                    {cOrders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum pedido vinculado.</p>
                    ) : (
                      <div className="grid gap-2">
                        <div className="text-xs font-medium text-muted-foreground">Pedidos:</div>
                        {cOrders.map((o) => (
                          <div key={o.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-sm">
                            <div>
                              <span className="font-medium">{o.projectName}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{o.quantity}x</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                              {o.precoVenda && <span className="text-xs font-medium filament-text">{brl(o.precoVenda * o.quantity)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── New Client Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutateAdd.mutate({ nome: form.nome.trim(), whatsapp: form.whatsapp.trim() || null, email: form.email.trim() || null, notas: form.notas.trim() || null }); }}>
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              <div className="grid gap-2"><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} type="email" /></div>
            </div>
            <div className="grid gap-2"><Label>Notas</Label><Input value={form.notas} onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))} placeholder="Observações sobre o cliente..." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={!form.nome.trim() || mutateAdd.isPending}>Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Client Dialog ── */}
      <Dialog open={!!editClient} onOpenChange={(open) => { if (!open) setEditClient(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          {editClient && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); mutateUpdate.mutate({ id: editClient.id, nome: (fd.get("nome") as string)?.trim(), whatsapp: (fd.get("whatsapp") as string)?.trim() || null, email: (fd.get("email") as string)?.trim() || null, notas: (fd.get("notas") as string)?.trim() || null }); }}>
              <div className="grid gap-2"><Label>Nome *</Label><Input name="nome" defaultValue={editClient.nome} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>WhatsApp</Label><Input name="whatsapp" defaultValue={editClient.whatsapp ?? ""} /></div>
                <div className="grid gap-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editClient.email ?? ""} /></div>
              </div>
              <div className="grid gap-2"><Label>Notas</Label><Input name="notas" defaultValue={editClient.notas ?? ""} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditClient(null)}>Cancelar</Button>
                <Button type="submit" className="btn-filament" disabled={mutateUpdate.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Client Dialog ── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover Cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza? Os pedidos vinculados não serão excluídos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && mutateRemove.mutate(deleteId)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
