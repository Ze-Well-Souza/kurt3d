import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectImagesPicker } from "./ProjectImagesPicker";
import { CATEGORIES } from "./calc-pedidos-shared";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function EditProjectDialog({ ctx }: { ctx: CalcPedidosCtx }) {
  const { editProject, setEditProject, mutateUpdateProject, editImages, setEditImages } = ctx;

  return (
    <Dialog
      open={!!editProject}
      onOpenChange={(open) => {
        if (!open) setEditProject(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>
        {editProject && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              mutateUpdateProject.mutate({
                id: editProject.id,
                nome: (fd.get("nome") as string)?.trim() || editProject.nome,
                categoria: (fd.get("categoria") as string) || editProject.categoria,
                linkModelo: (fd.get("linkModelo") as string) || null,
                filamentoId: (fd.get("filamentoId") as string) || null,
                custoRolo: Number(fd.get("custoRolo")) || editProject.custoRolo,
                pesoRolo: Number(fd.get("pesoRolo")) || editProject.pesoRolo,
                pesoPeca: Number(fd.get("pesoPeca")) || editProject.pesoPeca,
                tempoMin:
                  Number(fd.get("tempoHours")) * 60 + Number(fd.get("tempoMinutes")) ||
                  editProject.tempoMin,
                quantidade: Number(fd.get("quantidade")) || editProject.quantidade,
                precoVenda: Number(fd.get("precoVenda")) || editProject.precoVenda,
                perdaPercent: Number(fd.get("perdaPercent")) || 0,
                isPublic: editProject.isPublic ?? false,
                imageUrls: editImages,
              });
              setEditProject(null);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input name="nome" defaultValue={editProject.nome} />
              </div>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select name="categoria" defaultValue={editProject.categoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Link do Modelo</Label>
              <Input name="linkModelo" type="url" defaultValue={editProject.linkModelo ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Custo do Rolo (R$)</Label>
                <Input
                  name="custoRolo"
                  type="number"
                  step={0.01}
                  defaultValue={editProject.custoRolo}
                />
              </div>
              <div className="grid gap-2">
                <Label>Peso do Rolo (g)</Label>
                <Input name="pesoRolo" type="number" defaultValue={editProject.pesoRolo} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label>Peso Peça (g)</Label>
                <Input
                  name="pesoPeca"
                  type="number"
                  step={0.01}
                  defaultValue={editProject.pesoPeca}
                />
              </div>
              <div className="grid gap-2">
                <Label>Horas</Label>
                <Input
                  name="tempoHours"
                  type="number"
                  min={0}
                  defaultValue={Math.floor(editProject.tempoMin / 60)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Minutos</Label>
                <Input
                  name="tempoMinutes"
                  type="number"
                  min={0}
                  max={59}
                  defaultValue={editProject.tempoMin % 60}
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantidade</Label>
                <Input
                  name="quantidade"
                  type="number"
                  min={1}
                  defaultValue={editProject.quantidade}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Preço Venda (R$)</Label>
                <Input
                  name="precoVenda"
                  type="number"
                  step={0.01}
                  defaultValue={editProject.precoVenda}
                />
              </div>
              <div className="grid gap-2">
                <Label>% Desperdício</Label>
                <Input
                  name="perdaPercent"
                  type="number"
                  step={1}
                  defaultValue={editProject.perdaPercent ?? 0}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Imagens do site (galeria "Nossos trabalhos")</Label>
              <ProjectImagesPicker images={editImages} onChange={setEditImages} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProject(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="btn-filament"
                disabled={mutateUpdateProject.isPending}
              >
                {mutateUpdateProject.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
