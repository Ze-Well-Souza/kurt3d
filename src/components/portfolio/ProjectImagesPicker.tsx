import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_PROJECT_IMAGES = 10;

async function compressImageToWebpDataUrl(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    image.src = dataUrl;
  });
  // Comprime para WebP com teto de tamanho por foto: 10 fotos precisam caber no
  // limite de request da Vercel (~4,5MB) e fotos menores reduzem o egress do
  // Supabase Storage. Reduz qualidade/resolução até ficar abaixo do teto.
  const MAX_DATA_URL_CHARS = 400_000; // ~290KB binário por foto
  const attempts = [
    { maxSide: 1600, quality: 0.82 },
    { maxSide: 1600, quality: 0.7 },
    { maxSide: 1280, quality: 0.65 },
    { maxSide: 1024, quality: 0.6 },
    { maxSide: 800, quality: 0.55 },
  ];
  let result = "";
  for (const { maxSide, quality } of attempts) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    result = canvas.toDataURL("image/webp", quality);
    if (result.length <= MAX_DATA_URL_CHARS) return result;
  }
  return result;
}

export function ProjectImagesPicker({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PROJECT_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_PROJECT_IMAGES} imagens por projeto.`);
      return;
    }
    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);
    if (files.length > remaining)
      toast.warning(`Máximo de ${MAX_PROJECT_IMAGES} imagens — algumas foram ignoradas.`);
    try {
      const converted: string[] = [];
      for (const file of selected) {
        converted.push(await compressImageToWebpDataUrl(file));
      }
      if (converted.length > 0) onChange([...images, ...converted]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar imagem.");
    }
  }
  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((src, index) => (
            <div
              key={`${index}-${src.slice(-24)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              <img
                src={src}
                alt={`Imagem ${index + 1} do projeto`}
                className="h-full w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium">
                  Capa
                </span>
              )}
              <button
                type="button"
                aria-label={`Remover imagem ${index + 1}`}
                onClick={() => onChange(images.filter((_, i) => i !== index))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/40",
          images.length >= MAX_PROJECT_IMAGES && "pointer-events-none opacity-50",
        )}
      >
        <ImagePlus className="h-4 w-4" />
        Adicionar imagens ({images.length}/{MAX_PROJECT_IMAGES})
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
