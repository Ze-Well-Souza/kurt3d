import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, Printer, Plus, Trash2, Edit2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/api/data.functions";
import type { ProductionCalendarEvent } from "@/lib/domain/types";
import { useOrders } from "@/lib/hooks/use-orders";
import { useCalendarEvents } from "@/lib/hooks/use-calendar-events";

export const Route = createFileRoute("/admin/calendar")({
  component: Calendar,
});

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Imprimindo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function Calendar() {
  const qc = useQueryClient();
  const { data: ordersData } = useOrders();
  const { data: calendarEventsData } = useCalendarEvents();
  const orders = ordersData ?? [];
  const calendarEvents = (calendarEventsData ?? []) as ProductionCalendarEvent[];
  
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProductionCalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    orderId: "",
    title: "",
    startDate: "",
    startTime: "08:00",
    endDate: "",
    endTime: "18:00",
    printerName: "Bambu Lab A1",
    notes: "",
    status: "scheduled" as ProductionCalendarEvent["status"],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["calendar-events"] });

  const mutateCreate = useMutation({
    mutationFn: (data: any) => createCalendarEvent({ data }),
    onSuccess: () => {
      invalidate();
      toast.success("Evento criado com sucesso!");
      setShowEventDialog(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao criar evento"),
  });

  const mutateUpdate = useMutation({
    mutationFn: (data: any) => updateCalendarEvent({ data }),
    onSuccess: () => {
      invalidate();
      toast.success("Evento atualizado!");
      setShowEventDialog(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar evento"),
  });

  const mutateDelete = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent({ data: { eventId: id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Evento removido!");
      setShowEventDialog(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: () => toast.error("Erro ao remover evento"),
  });

  const resetForm = () => {
    setEventForm({
      orderId: "",
      title: "",
      startDate: "",
      startTime: "08:00",
      endDate: "",
      endTime: "18:00",
      printerName: "Bambu Lab A1",
      notes: "",
      status: "scheduled",
    });
  };

  const openNewEvent = () => {
    resetForm();
    setEditingEvent(null);
    setShowEventDialog(true);
  };

  const openEditEvent = (event: ProductionCalendarEvent) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    setEventForm({
      orderId: event.orderId,
      title: event.title,
      startDate: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().slice(0, 10),
      endTime: end.toTimeString().slice(0, 5),
      printerName: event.printerName,
      notes: event.notes ?? "",
      status: event.status,
    });
    setEditingEvent(event);
    setShowEventDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateTime = `${eventForm.startDate}T${eventForm.startTime}:00`;
    const endDateTime = `${eventForm.endDate}T${eventForm.endTime}:00`;
    
    const data = {
      orderId: eventForm.orderId || "manual",
      title: eventForm.title,
      startDate: startDateTime,
      endDate: endDateTime,
      printerName: eventForm.printerName,
      notes: eventForm.notes || null,
      status: eventForm.status,
    };

    if (editingEvent) {
      mutateUpdate.mutate({ eventId: editingEvent.id, ...data });
    } else {
      mutateCreate.mutate(data);
    }
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    if (!date) return [];
    const dateStr = date.toISOString().slice(0, 10);
    return calendarEvents.filter((event) => {
      const eventStart = event.startDate.slice(0, 10);
      const eventEnd = event.endDate.slice(0, 10);
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthName = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Calendário de Produção</h1>
          <p className="text-sm text-muted-foreground">
            Planeje e acompanhe a produção das impressoras 3D.
          </p>
        </div>
        <Button className="btn-filament gap-2" onClick={openNewEvent}>
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {/* Calendar Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={prevMonth}>◀</Button>
            <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
            <Button variant="outline" size="sm" onClick={nextMonth}>▶</Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>Hoje</Button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {weekDays.map((day) => (
            <div key={day} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dayEvents = date ? getEventsForDay(date) : [];
            const isToday = date?.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-[100px] border-r border-b border-border p-2 ${!date ? "bg-muted/30" : ""}`}
              >
                {date && (
                  <>
                    <div className={`mb-1 text-sm font-medium ${isToday ? "rounded-full bg-filament-green px-2 py-0.5 text-white" : "text-muted-foreground"}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => openEditEvent(event)}
                          className={`w-full truncate rounded px-1.5 py-1 text-left text-xs text-white hover:opacity-90 ${STATUS_COLORS[event.status]}`}
                          title={event.title}
                        >
                          {event.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} mais</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming Events List */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Próximos Eventos</h2>
        </div>
        {calendarEvents.filter((e) => new Date(e.endDate) >= new Date()).length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum evento agendado. Clique em "Novo Evento" para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {calendarEvents
              .filter((e) => new Date(e.endDate) >= new Date())
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .slice(0, 10)
              .map((event) => (
                <div key={event.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[event.status]}`} />
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(event.startDate).toLocaleString("pt-BR")} - {new Date(event.endDate).toLocaleString("pt-BR")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Printer className="inline h-3 w-3 mr-1" />
                        {event.printerName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{STATUS_LABELS[event.status]}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEditEvent(event)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm((s) => ({ ...s, title: e.target.value }))}
                required
                placeholder="Ex: Impressão Peça XYZ"
              />
            </div>
            <div className="grid gap-2">
              <Label>Pedido (opcional)</Label>
              <Select value={eventForm.orderId} onValueChange={(v) => setEventForm((s) => ({ ...s, orderId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um pedido" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (sem pedido)</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>{order.projectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data início *</Label>
                <Input type="date" value={eventForm.startDate} onChange={(e) => setEventForm((s) => ({ ...s, startDate: e.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>Hora início</Label>
                <Input type="time" value={eventForm.startTime} onChange={(e) => setEventForm((s) => ({ ...s, startTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data fim *</Label>
                <Input type="date" value={eventForm.endDate} onChange={(e) => setEventForm((s) => ({ ...s, endDate: e.target.value }))} required />
              </div>
              <div className="grid gap-2">
                <Label>Hora fim</Label>
                <Input type="time" value={eventForm.endTime} onChange={(e) => setEventForm((s) => ({ ...s, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Impressora</Label>
              <Input
                value={eventForm.printerName}
                onChange={(e) => setEventForm((s) => ({ ...s, printerName: e.target.value }))}
                placeholder="Bambu Lab A1"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={eventForm.status} onValueChange={(v: any) => setEventForm((s) => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="in_progress">Imprimindo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input
                value={eventForm.notes}
                onChange={(e) => setEventForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Notas adicionais..."
              />
            </div>
            <DialogFooter className="gap-2">
              {editingEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => mutateDelete.mutate(editingEvent.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={mutateCreate.isPending || mutateUpdate.isPending}>
                {editingEvent ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
