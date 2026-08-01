import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ArrowRight, Cpu, Layers, Zap, Instagram, Youtube, Play, MessageCircle, Upload, ImagePlus, X, Link as LinkIcon, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { submitLead } from "@/lib/api/data.functions";
import { getSiteContent } from "@/lib/api/auth.functions";
import { KurtiLogo } from "@/components/KurtiLogo";
import { DEFAULT_SITE_CONTENT } from "@/lib/domain/types";
import { usePublicSnapshot } from "@/lib/hooks/use-public-snapshot";
import heroImg from "@/assets/hero-printer.jpg";
import instagramQr from "@/assets/instagram-qr-card.png";
import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import work5 from "@/assets/work-5.jpg";
import work6 from "@/assets/work-6.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kurti 3D — Impressão 3D multicor de alta qualidade" },
      { name: "description", content: "Sociedade Zé & Kurt. Tecnologia Bambu Lab com AMS. Impressão 3D multicor rápida, colorida e perfeita." },
      { property: "og:title", content: "Kurti 3D — Rápido. Colorido. Perfeito." },
      { property: "og:description", content: "Impressão 3D multicor com Bambu Lab AMS. Faça seu orçamento." },
    ],
  }),
  component: Landing,
});

const fallbackGallery = [
  { src: work1, alt: "Vaso 3D arco-íris", span: "row-span-2" },
  { src: work2, alt: "Corações multicoloridos", span: "" },
  { src: work3, alt: "Dragão articulado colorido", span: "row-span-2" },
  { src: work4, alt: "Vaso geométrico neon", span: "" },
  { src: work5, alt: "Castelo miniatura colorido", span: "" },
  { src: work6, alt: "Corrente flexível multicolor", span: "row-span-2" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <Nav />
      <Hero />
      <Features />
      <Gallery />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <a href="#work" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Portfólio</a>
      <a href="#testimonials" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Depoimentos</a>
      <a href="#services" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Serviços</a>
      <a href="#contact" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Contato</a>
      <Link to="/acompanhar" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Acompanhar pedido</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 md:h-20 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/">
          <KurtiLogo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
          <SocialIcons className="hidden md:flex" />
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Painel</Button>
          </Link>
          <a href="#contact" className="btn-filament hidden h-10 items-center px-5 text-sm font-semibold sm:inline-flex">
            Faça seu Orçamento
          </a>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader className="mb-6">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 text-base font-medium">
                {navLinks}
                <Link to="/admin" className="transition-colors hover:text-foreground" onClick={() => setMobileOpen(false)}>Painel Admin</Link>
                <a href="#contact" className="btn-filament mt-2 inline-flex h-10 items-center justify-center px-5 text-sm font-semibold" onClick={() => setMobileOpen(false)}>
                  Faça seu Orçamento
                </a>
              </nav>
              <div className="mt-6">
                <SocialIcons className="flex" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="filament-divider" />
    </header>
  );
}

function Hero() {
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const c = contentQ.data ?? DEFAULT_SITE_CONTENT;

  const heroLines = c.heroTitulo.split("\n");

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--filament-green)" }} />
            Tecnologia Bambu Lab com AMS
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tighter md:text-7xl">
            {heroLines[0]}{heroLines.length > 1 ? <><br /></> : null}
            {heroLines.length > 1 && (
              <span
                style={{
                  backgroundImage: "var(--gradient-filament)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {heroLines[1]}
              </span>
            )}
            {heroLines.length > 2 && <>{" "}<span className="text-foreground">{heroLines.slice(2).join(" ")}</span></>}
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            {c.heroSubtitulo}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="btn-filament inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold">
              Faça seu Orçamento <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#work"><Button size="lg" variant="outline">Ver portfólio</Button></a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 pt-6">
            {c.heroStats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-2xl font-extrabold" style={{ color: s.label === "Camada" ? "var(--filament-cyan)" : s.label === "Entrega" ? "var(--filament-pink)" : "var(--filament-yellow)" }}>{s.valor}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="filament-border shadow-2xl">
            <img
              src={heroImg}
              alt="Impressora Bambu Lab com AMS"
              width={1280}
              height={1024}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const c = contentQ.data ?? DEFAULT_SITE_CONTENT;
  const colors = ["var(--filament-cyan)", "var(--filament-pink)", "var(--filament-green)"];
  const icons = [Cpu, Zap, Layers];

  return (
    <section id="services" className="bg-card/50">
      <div className="filament-divider" />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
        {c.features.map((f, i) => {
          const Icon = icons[i] ?? Cpu;
          const color = colors[i] ?? "var(--filament-cyan)";
          return (
            <div key={f.titulo} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: color }}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.descricao}</p>
            </div>
          );
        })}
      </div>
      <div className="filament-divider" />
    </section>
  );
}

function Gallery() {
  const snap = usePublicSnapshot();
  const portfolio = snap.data?.portfolio ?? [];
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [materialFilter, setMaterialFilter] = useState("Todos");
  const [colorFilter, setColorFilter] = useState("Todas");

  // Só exibimos publicamente projetos que têm ao menos uma foto (evita cards vazios).
  const portfolioWithImages = useMemo(
    () => portfolio.filter((p) => (p.imageUrls?.length ?? 0) > 0 || !!p.imageUrl),
    [portfolio],
  );

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(portfolioWithImages.map((p) => p.categoria).filter(Boolean)))],
    [portfolioWithImages],
  );
  const materials = useMemo(
    () => ["Todos", ...Array.from(new Set(portfolioWithImages.map((p) => p.filamentoMaterial).filter((v): v is string => v !== null && v !== undefined)))],
    [portfolioWithImages],
  );
  const colors = useMemo(
    () => ["Todas", ...Array.from(new Set(portfolioWithImages.map((p) => p.filamentoCor).filter((v): v is string => v !== null && v !== undefined)))],
    [portfolioWithImages],
  );
  const filteredPortfolio = useMemo(
    () =>
      portfolioWithImages.filter((p) => {
        const categoryMatches = categoryFilter === "Todos" || p.categoria === categoryFilter;
        const materialMatches = materialFilter === "Todos" || p.filamentoMaterial === materialFilter;
        const colorMatches = colorFilter === "Todas" || p.filamentoCor === colorFilter;
        return categoryMatches && materialMatches && colorMatches;
      }),
    [categoryFilter, colorFilter, materialFilter, portfolioWithImages],
  );

  // Enquanto não houver fotos reais publicadas, mostramos a vitrine de imagens bonitas.
  const hasProjects = portfolioWithImages.length > 0;

  return (
    <section id="work" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--filament-magenta)" }}>Portfólio</div>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Nossos trabalhos</h2>
        </div>
        <p className="hidden max-w-sm text-sm text-muted-foreground md:block">
          Uma amostra das peças, modelos e protótipos impressos no nosso estúdio.
        </p>
      </div>

      {hasProjects ? (
        <div className="mb-8 flex flex-wrap gap-3">
          <FilterGroup label="Categoria" options={categories} value={categoryFilter} onChange={setCategoryFilter} />
          <FilterGroup label="Material" options={materials} value={materialFilter} onChange={setMaterialFilter} />
          <FilterGroup label="Cor" options={colors} value={colorFilter} onChange={setColorFilter} />
        </div>
      ) : null}

      {hasProjects ? (
        <div className="grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4">
          {/* Video card placeholder — ready for MP4/Reels */}
          <VideoCard />

          {filteredPortfolio.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
          {/* Video card placeholder */}
          <VideoCard />

          {fallbackGallery.map((g) => (
            <figure
              key={g.alt}
              className={`group relative overflow-hidden rounded-xl border border-border bg-muted ${g.span}`}
            >
              <img
                src={g.src}
                alt={g.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-background/95 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <figcaption className="text-sm font-medium">{g.alt}</figcaption>
              </div>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

type PublicProject = {
  id: string;
  nome: string;
  categoria: string;
  imageUrl: string | null;
  imageUrls: string[];
  filamentoMaterial?: string | null;
  filamentoCor?: string | null;
};

function ProjectCard({ project }: { project: PublicProject }) {
  // Reúne as imagens do projeto (galeria + capa legada), sem duplicar.
  const images = useMemo(() => {
    const list = [...(project.imageUrls ?? [])];
    if (project.imageUrl && !list.includes(project.imageUrl)) list.unshift(project.imageUrl);
    return list;
  }, [project.imageUrl, project.imageUrls]);
  const [index, setIndex] = useState(0);
  const hasImages = images.length > 0;
  const multiple = images.length > 1;
  const current = hasImages ? images[Math.min(index, images.length - 1)] : null;

  function go(delta: number) {
    setIndex((prev) => (prev + delta + images.length) % images.length);
  }

  return (
    <figure className="group relative overflow-hidden rounded-xl border border-border bg-card">
      {current ? (
        <img
          src={current}
          alt={project.nome}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-muted/40">
          <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}

      {/* Gradiente para leitura do texto sobre a imagem */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />

      <div className="absolute left-3 top-3 z-10">
        <Badge variant="secondary">{project.categoria}</Badge>
      </div>

      {multiple && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute right-3 top-3 z-10 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium">
            {index + 1}/{images.length}
          </div>
        </>
      )}

      <figcaption className="absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="mb-1 flex flex-wrap gap-1">
          {project.filamentoMaterial ? <Badge variant="outline" className="text-[10px]">{project.filamentoMaterial}</Badge> : null}
          {project.filamentoCor ? <Badge variant="outline" className="text-[10px]">{project.filamentoCor}</Badge> : null}
        </div>
        <p className="font-display text-base font-bold leading-tight">{project.nome}</p>
      </figcaption>
    </figure>
  );
}

function Testimonials() {
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const testimonials = (contentQ.data ?? DEFAULT_SITE_CONTENT).testimonials;

  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--filament-yellow)" }}>Depoimentos</div>
        <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          O que os clientes dizem
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div key={`${testimonial.nome}-${testimonial.cargo}`} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm leading-6 text-muted-foreground">"{testimonial.texto}"</p>
            <div className="mt-5">
              <div className="font-semibold">{testimonial.nome}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{testimonial.cargo}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === value ? "default" : "outline"}
            size="sm"
            className={option === value ? "btn-filament" : ""}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

type ContactImage = { file: File; preview: string };

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB por foto original (é comprimida antes do envio)
const MAX_IMAGES = 6;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Comprime a foto do cliente para WebP antes de enviar: mantém o request dentro
// do limite da Vercel (~4,5MB com até 6 fotos) e reduz o egress do Supabase Storage.
async function compressContactImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    image.src = dataUrl;
  });
  const MAX_DATA_URL_CHARS = 400_000; // ~290KB binário por foto
  const attempts = [
    { maxSide: 1280, quality: 0.8 },
    { maxSide: 1280, quality: 0.65 },
    { maxSide: 1024, quality: 0.6 },
    { maxSide: 800, quality: 0.55 },
  ];
  let result = dataUrl;
  for (const { maxSide, quality } of attempts) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    result = canvas.toDataURL("image/webp", quality);
    if (result.length <= MAX_DATA_URL_CHARS) return result;
  }
  return result;
}

function Contact() {
  const [loading, setLoading] = useState(false);
  const [linkProjeto, setLinkProjeto] = useState("");
  const [images, setImages] = useState<ContactImage[]>([]);
  const snap = usePublicSnapshot();
  const whatsappNumero = snap.data?.settings?.whatsappNumero ?? "5511999999999";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens.`);
      return;
    }
    const picks = Array.from(files).slice(0, available);
    for (const f of picks) {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" não é uma imagem.`);
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast.error(`"${f.name}" ultrapassa o limite de 15 MB.`);
        continue;
      }
      // Comprime já na seleção: o preview leve também é o payload enviado.
      try {
        const preview = await compressContactImage(f);
        setImages((prev) => [...prev, { file: f, preview }]);
      } catch {
        toast.error(`Não foi possível processar "${f.name}".`);
      }
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nome = formData.get("name") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const mensagem = formData.get("project") as string;

    const imgList = images.map((img) => ({
      nome: img.file.name,
      tipo: "image/webp",
      dataUrl: img.preview,
    }));

    setLoading(true);
    try {
      const result = await submitLead({
        data: {
          nome,
          whatsapp,
          mensagem,
          linkProjeto: linkProjeto.trim() || undefined,
          imagens: imgList.length > 0 ? imgList : undefined,
        },
      });
      toast.success("Mensagem enviada — responderemos em até 24h.");
      form.reset();
      setLinkProjeto("");
      setImages([]);
      // Open WhatsApp with pre-formatted message
      const imgNote =
        result.imagens && result.imagens.length > 0
          ? `\n\n📎 ${result.imagens.length} imagem(ns) anexa(s): ${result.imagens.map((i) => i.publicUrl).join(", ")}`
          : "";
      const linkNote = linkProjeto.trim() ? `\n\nLink de referência: ${linkProjeto.trim()}` : "";
      const text = encodeURIComponent(
        `Olá! Meu nome é ${nome}.\n\n${mensagem}${linkNote}${imgNote}\n\n(WhatsApp: ${whatsapp})`,
      );
      window.open(`https://wa.me/${whatsappNumero}?text=${text}`, "_blank");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="bg-card/50">
      <div className="filament-divider" />
      <div className="mx-auto max-w-2xl px-6 py-24">
        <div className="mb-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--filament-cyan)" }}>Contato</div>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Tem uma peça em mente?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Envie seu STL ou apenas um esboço — retornamos com orçamento e prazo em até 24 horas.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" type="tel" required placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project">Mensagem</Label>
            <Textarea id="project" name="project" required rows={5} placeholder="Conte sobre a peça, material, quantidade…" />
          </div>

          {/* Link do projeto (MakerWorld, Thingiverse, etc.) */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="linkProjeto" className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              Link de referência <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="linkProjeto"
              type="url"
              value={linkProjeto}
              onChange={(e) => setLinkProjeto(e.target.value)}
              placeholder="https://makerworld.com/... ou thingiverse, printables, etc."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              Viu um modelo no MakerWorld ou em outro site? Cole o link aqui.
            </p>
          </div>

          {/* Upload de imagens */}
          <div className="mt-4 space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" />
              Imagens de referência <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <label
              htmlFor="contact-images"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <Upload className="h-5 w-5" />
              <span className="font-medium">Clique para enviar imagens</span>
              <span className="text-xs">
                PNG, JPG ou WEBP · até {MAX_IMAGES} imagens · máx. 2 MB cada
              </span>
            </label>
            <input
              id="contact-images"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-destructive hover:text-white"
                      aria-label={`Remover ${img.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {img.file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-filament mt-6 inline-flex h-12 w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60">
            {loading ? "Enviando…" : <><MessageCircle className="h-4 w-4" />Enviar mensagem</>}
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const c = contentQ.data ?? DEFAULT_SITE_CONTENT;

  return (
    <footer>
      <div className="filament-divider" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kurti 3D — Sociedade Zé &amp; Kurt. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={c.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Siga a Kurti 3D no Instagram"
            className="block overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-sm transition-transform hover:scale-105"
          >
            <img src={instagramQr} alt="QR code do Instagram @kurti3d" className="h-28 w-auto" loading="lazy" />
          </a>
          <p className="max-w-[10rem] text-xs text-muted-foreground">
            Aponte a câmera e siga a gente no Instagram. Feito com filamento multicor.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialIcons({ className = "" }: { className?: string }) {
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const c = contentQ.data ?? DEFAULT_SITE_CONTENT;

  return (
    <div className={`items-center gap-1 ${className}`}>
      <a
        href={c.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Instagram className="h-4 w-4" />
      </a>
      <a
        href={c.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Youtube className="h-4 w-4" />
      </a>
    </div>
  );
}

/** Video card placeholder — ready for MP4/Reels with Kurtido hover effect */
function VideoCard() {
  return (
    <figure className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/60 p-6 text-center transition-all duration-300 hover:border-solid hover:shadow-lg">
      <div className="grid h-14 w-14 place-items-center rounded-full transition-all duration-300 group-hover:scale-110" style={{ background: "var(--gradient-filament)", backgroundSize: "200% 100%" }}>
        <Play className="h-6 w-6 text-white fill-white" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">Vídeo em breve</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Reels da Bambu Lab A1 trabalhando
      </p>
      {/* Kurtido hover overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="pb-5">
          <p className="text-xs font-bold filament-text">Kurtido ao vivo!</p>
          <p className="text-[11px] text-muted-foreground">Em breve — vídeos dos prints</p>
        </div>
      </div>
    </figure>
  );
}
