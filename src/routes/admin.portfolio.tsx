import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Upload, X, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/portfolio")({
  component: Portfolio,
});

const CATEGORIES = ["Action Figure", "Mechanical Part", "Decoration", "Prototype", "Cosplay"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  category: z.enum(CATEGORIES),
  spoolCost: z.number().min(0).max(10000),
  weightG: z.number().min(0).max(100000),
  salePrice: z.number().min(0).max(100000),
  published: z.boolean(),
  imageUrl: z.string().optional(),
});

type Project = z.infer<typeof schema> & { id: string };

// Spool cost per kg → cost = spoolCost * (weight / 1000)
function materialCost(p: Pick<Project, "spoolCost" | "weightG">) {
  return (p.spoolCost * p.weightG) / 1000;
}
function profit(p: Pick<Project, "spoolCost" | "weightG" | "salePrice">) {
  return p.salePrice - materialCost(p);
}

const initialForm = {
  name: "",
  category: "Action Figure" as (typeof CATEGORIES)[number],
  spoolCost: "",
  weightG: "",
  salePrice: "",
  published: true,
  imageUrl: undefined as string | undefined,
};

function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(initialForm);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name: form.name,
      category: form.category,
      spoolCost: Number(form.spoolCost),
      weightG: Number(form.weightG),
      salePrice: Number(form.salePrice),
      published: form.published,
      imageUrl: form.imageUrl,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setProjects((p) => [{ ...parsed.data, id: crypto.randomUUID() }, ...p]);
    setForm(initialForm);
    toast.success("Project added to portfolio.");
  };

  const togglePublish = (id: string) =>
    setProjects((list) =>
      list.map((p) => (p.id === id ? { ...p, published: !p.published } : p))
    );

  const remove = (id: string) =>
    setProjects((list) => list.filter((p) => p.id !== id));

  const totals = useMemo(() => {
    const totalProfit = projects.reduce((s, p) => s + profit(p), 0);
    const published = projects.filter((p) => p.published).length;
    return { totalProfit, published };
  }, [projects]);

  return (
    <div className="space-y-8">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio Manager</h1>
          <p className="text-sm text-muted-foreground">
            Add new prints, track margins, and choose what goes on the public gallery.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total profit</div>
            <div className="font-display text-xl font-bold text-primary">
              ${totals.totalProfit.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Published</div>
            <div className="font-display text-xl font-bold">
              {totals.published} / {projects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={submit}
        className="grid gap-6 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1fr_1.2fr]"
      >
        {/* Drop zone */}
        <div className="space-y-2">
          <Label>Project Image</Label>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setForm((f) => ({ ...f, imageUrl: undefined }));
                  }}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur transition-colors hover:bg-background"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Drop an image here</p>
                <p className="text-xs text-muted-foreground">or click to browse · PNG, JPG up to 5MB</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Articulated dragon v2"
                maxLength={100}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as (typeof CATEGORIES)[number] })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="spoolCost" label="Spool Cost ($/kg)" value={form.spoolCost}
              onChange={(v) => setForm({ ...form, spoolCost: v })} placeholder="25"
            />
            <NumberField
              id="weight" label="Print Weight (g)" value={form.weightG}
              onChange={(v) => setForm({ ...form, weightG: v })} placeholder="120"
            />
            <NumberField
              id="price" label="Sale Price ($)" value={form.salePrice}
              onChange={(v) => setForm({ ...form, salePrice: v })} placeholder="45"
            />
          </div>

          {/* Live profit preview */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Estimated profit</span>
            <span className="font-display text-base font-bold text-primary">
              ${profit({
                spoolCost: Number(form.spoolCost) || 0,
                weightG: Number(form.weightG) || 0,
                salePrice: Number(form.salePrice) || 0,
              }).toFixed(2)}
            </span>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div>
              <Label htmlFor="publish" className="text-sm font-semibold">
                Publish to Public Website Gallery
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Visible on the home page portfolio when enabled.
              </p>
            </div>
            <Switch
              id="publish"
              checked={form.published}
              onCheckedChange={(c) => setForm({ ...form, published: c })}
            />
          </div>

          <Button type="submit" size="lg" className="w-full gap-2">
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Projects</h2>
          <span className="text-xs text-muted-foreground">{projects.length} total</span>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No projects yet. Add your first print above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Material</TableHead>
                <TableHead className="text-right">Sale</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const prof = profit(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted" />
                        )}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      ${materialCost(p).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">${p.salePrice.toFixed(2)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${prof >= 0 ? "text-primary" : "text-destructive"}`}>
                      ${prof.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => togglePublish(p.id)} className="cursor-pointer">
                        {p.published ? (
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(p.id)}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function NumberField({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
