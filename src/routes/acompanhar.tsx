import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Clock3, PackageSearch, Truck } from "lucide-react";
import { getPublicOrderTracking } from "@/lib/api/data.functions";

export const Route = createFileRoute("/acompanhar")({
  head: () => ({
    meta: [{ title: "Acompanhar Pedido — Kurti 3D" }],
  }),
  component: OrderTrackingPage,
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function OrderTrackingPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");

  const trackingQuery = useMutation({
    mutationFn: (input: { code: string; phone: string }) => getPublicOrderTracking({ data: input }),
    onError: () => toast.error("Nao foi possivel consultar o pedido."),
  });

  const result = trackingQuery.data?.ok ? trackingQuery.data.order : null;

  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground">
      <Toaster />
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Acompanhamento
            </div>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
              Acompanhe seu pedido
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Consulte o andamento usando o codigo de acompanhamento e o WhatsApp informado no pedido.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card className="rounded-2xl border border-border bg-card p-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const response = await trackingQuery.mutateAsync({ code, phone });
              if (!response.ok) {
                toast.error("Pedido nao encontrado. Revise o codigo e o WhatsApp.");
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="code">Codigo de acompanhamento</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex.: 1234567890AB"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp do pedido</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="btn-filament w-full" disabled={trackingQuery.isPending}>
                {trackingQuery.isPending ? "Consultando..." : "Consultar pedido"}
              </Button>
            </div>
          </form>
        </Card>

        {result && (
          <Card className="space-y-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Pedido</div>
                <h2 className="font-display text-2xl font-bold">{result.projectName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Codigo {result.trackingCode}</p>
              </div>
              <Badge variant="secondary" className="text-sm">{result.statusLabel}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatusStep active={result.step >= 1} label="Confirmado" icon={<PackageSearch className="h-4 w-4" />} />
              <StatusStep active={result.step >= 2} label="Em producao" icon={<Clock3 className="h-4 w-4" />} />
              <StatusStep active={result.step >= 3} label="Pronto / entregue" icon={<Truck className="h-4 w-4" />} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Quantidade" value={`${result.quantity} un.`} />
              <InfoRow label="Criado em" value={formatDate(result.createdAt)} />
              <InfoRow label="Ultima atualizacao" value={formatDate(result.updatedAt)} />
              <InfoRow label="Previsao operacional" value={formatDate(result.estimatedDeliveryAt)} />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              {result.statusDescription}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusStep({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
