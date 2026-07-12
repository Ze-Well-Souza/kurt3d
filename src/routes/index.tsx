import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowRight, Cpu, Layers, Zap, Instagram, Youtube, Play, MessageCircle, Upload, ImagePlus, X, Link as LinkIcon } from "lucide-react";
import { submitLead } from "@/lib/api/data.functions";
import { getSiteContent } from "@/lib/api/auth.functions";
import { KurtiLogo } from "@/components/KurtiLogo";
import { DEFAULT_SITE_CONTENT } from "@/lib/domain/types";
import { calcCostFromInputs } from "@/lib/domain/cost";
import { usePublicSnapshot } from "@/lib/hooks/use-public-snapshot";
import heroImg from "@/assets/hero-printer.jpg";
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
      <PublicQuote />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/">
          <KurtiLogo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#work" className="transition-colors hover:text-foreground">Portfólio</a>
          <a href="#quote" className="transition-colors hover:text-foreground">Pré-orçamento</a>
          <a href="#testimonials" className="transition-colors hover:text-foreground">Depoimentos</a>
          <a href="#services" className="transition-colors hover:text-foreground">Serviços</a>
          <a href="#contact" className="transition-colors hover:text-foreground">Contato</a>
          <Link to="/acompanhar" className="transition-colors hover:text-foreground">Acompanhar pedido</Link>
        </nav>
        <div className="flex items-center gap-2">
          <SocialIcons className="hidden md:flex" />
          <Link to="/admin">
            <Button variant="ghost" size="sm">Admin</Button>
          </Link>
          <a href="#contact" className="btn-filament inline-flex h-10 items-center px-5 text-sm font-semibold">
            Faça seu Orçamento
          </a>
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

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(portfolio.map((p) => p.categoria).filter(Boolean)))],
    [portfolio],
  );
  const materials = useMemo(
    () => ["Todos", ...Array.from(new Set(portfolio.map((p) => p.filamentoMaterial).filter((v): v is string => v !== null && v !== undefined)))],
    [portfolio],
  );
  const colors = useMemo(
    () => ["Todas", ...Array.from(new Set(portfolio.map((p) => p.filamentoCor).filter((v): v is string => v !== null && v !== undefined)))],
    [portfolio],
  );
  const filteredPortfolio = useMemo(
    () =>
      portfolio.filter((p) => {
        const categoryMatches = categoryFilter === "Todos" || p.categoria === categoryFilter;
        const materialMatches = materialFilter === "Todos" || p.filamentoMaterial === materialFilter;
        const colorMatches = colorFilter === "Todas" || p.filamentoCor === colorFilter;
        return categoryMatches && materialMatches && colorMatches;
      }),
    [categoryFilter, colorFilter, materialFilter, portfolio],
  );

  const hasProjects = portfolio.length > 0;

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

          {filteredPortfolio.map((p) => {
            const hasImage = !!p.imageUrl;
            return (
            <figure
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              {hasImage && (
                <img
                  src={p.imageUrl!}
                  alt={p.nome}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-20"
                />
              )}
              <div className="relative z-10 flex h-full flex-col justify-between p-5">
                <div>
                  <Badge variant="secondary" className="mb-2">{p.categoria}</Badge>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {p.filamentoMaterial ? <Badge variant="outline" className="text-[10px]">{p.filamentoMaterial}</Badge> : null}
                    {p.filamentoCor ? <Badge variant="outline" className="text-[10px]">{p.filamentoCor}</Badge> : null}
                  </div>
                  <p className="font-display text-lg font-bold leading-tight">{p.nome}</p>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{p.quantidade}</span> un. · {p.tempoMin}min
                  </div>
                  <span
                    className="font-display text-sm font-bold"
                    style={{ color: "var(--filament-green)" }}
                  >
                    R$ {p.precoVenda.toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Kurtido hover effect */}
              <div className="pointer-events-none absolute inset-0 z-20 translate-y-full bg-gradient-to-t from-background/90 via-background/40 to-transparent transition-transform duration-500 group-hover:translate-y-0">
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-xs font-semibold filament-text">Kurtido com qualidade!</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.pesoPeca}g/un. · Filamento {p.pesoRolo}g
                  </p>
                </div>
              </div>
            </figure>
          );
          })}
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

function PublicQuote() {
  const snap = usePublicSnapshot();
  const portfolio = snap.data?.portfolio ?? [];
  const settings = snap.data?.settings;
  const [projectId, setProjectId] = useState("");
  const [pesoPeca, setPesoPeca] = useState("");
  const [tempoMin, setTempoMin] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [precoVenda, setPrecoVenda] = useState("");
  const selectedProject = portfolio.find((item) => item.id === projectId) ?? null;

  const derivedMarkup = useMemo(() => {
    const ratios = portfolio
      .map((item) => {
        const breakdown = calcCostFromInputs({
          custoRolo: item.custoRolo,
          pesoRolo: item.pesoRolo,
          pesoPeca: item.pesoPeca,
          tempoMin: item.tempoMin,
          quantidade: 1,
          precoVenda: item.precoVenda,
          settings,
        });
        return breakdown.custoUnidade > 0 ? item.precoVenda / breakdown.custoUnidade : null;
      })
      .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    if (ratios.length === 0) return 1.6;
    return Math.min(3, Math.max(1.2, ratios[Math.floor(ratios.length / 2)]));
  }, [portfolio, settings]);

  const calculated = useMemo(() => {
    const quantity = Math.max(1, Number(quantidade) || 1);
    const peso = Math.max(0, Number(pesoPeca) || 0);
    const tempo = Math.max(0, Number(tempoMin) || 0);
    const unitPrice = Math.max(0, Number(precoVenda) || 0);
    const sellingPrice = unitPrice > 0 ? unitPrice : Number((calcCostFromInputs({
      custoRolo: selectedProject?.custoRolo ?? 120,
      pesoRolo: selectedProject?.pesoRolo ?? 1000,
      pesoPeca: peso,
      tempoMin: tempo,
      quantidade: 1,
      precoVenda: 0,
      settings,
    }).custoUnidade * derivedMarkup).toFixed(2));

    return calcCostFromInputs({
      custoRolo: selectedProject?.custoRolo ?? 120,
      pesoRolo: selectedProject?.pesoRolo ?? 1000,
      pesoPeca: peso,
      tempoMin: tempo,
      quantidade: quantity,
      precoVenda: sellingPrice,
      settings,
    });
  }, [derivedMarkup, pesoPeca, precoVenda, quantidade, selectedProject, settings, tempoMin]);

  useEffect(() => {
    if (!selectedProject) return;
    setPesoPeca(String(selectedProject.pesoPeca));
    setTempoMin(String(selectedProject.tempoMin));
    setPrecoVenda(String(selectedProject.precoVenda));
  }, [selectedProject]);

  return (
    <section id="quote" className="bg-card/50">
      <div className="filament-divider" />
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--filament-green)" }}>Pré-orçamento</div>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Simule um orçamento online
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Use um projeto do portfólio como base ou preencha peso, tempo e quantidade para receber uma estimativa inicial.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Usar projeto do portfólio como base</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Projeto personalizado</option>
                  {portfolio.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} · {item.categoria}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Peso por peça (g)</Label>
                <Input value={pesoPeca} onChange={(e) => setPesoPeca(e.target.value)} placeholder="Ex.: 45" />
              </div>
              <div className="space-y-2">
                <Label>Tempo por peça (min)</Label>
                <Input value={tempoMin} onChange={(e) => setTempoMin(e.target.value)} placeholder="Ex.: 180" />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Preço unitário alvo (opcional)</Label>
                <Input value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="Se vazio, calculamos uma sugestão" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Esta simulacao gera uma estimativa inicial. O valor final pode variar conforme acabamento, suporte, pintura ou montagem.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Resumo estimado</div>
                <h3 className="mt-2 font-display text-2xl font-bold">
                  {selectedProject?.nome ?? "Projeto personalizado"}
                </h3>
              </div>
              <QuoteRow label="Custo estimado do lote" value={formatMoney(calculated.custoLote)} />
              <QuoteRow label="Receita estimada do lote" value={formatMoney(calculated.receitaTotal)} />
              <QuoteRow label="Custo por unidade" value={formatMoney(calculated.custoUnidade)} />
              <QuoteRow label="Filamento por unidade" value={formatMoney(calculated.custoFilamento)} />
              <QuoteRow label="Energia por unidade" value={formatMoney(calculated.custoEnergia)} />
              <QuoteRow label="Base comercial usada" value={`${derivedMarkup.toFixed(2)}x o custo`} />
              <a href="#contact" className="btn-filament inline-flex h-11 w-full items-center justify-center px-4 text-sm font-semibold">
                Solicitar orçamento final
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="filament-divider" />
    </section>
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

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type ContactImage = { file: File; preview: string };

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB per image
const MAX_IMAGES = 6;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
        toast.error(`"${f.name}" ultrapassa o limite de 2 MB.`);
        continue;
      }
      const preview = await fileToDataUrl(f);
      setImages((prev) => [...prev, { file: f, preview }]);
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

    const imgList = await Promise.all(
      images.map(async (img) => ({
        nome: img.file.name,
        tipo: img.file.type || "image/jpeg",
        dataUrl: await fileToDataUrl(img.file),
      })),
    );

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
  return (
    <footer>
      <div className="filament-divider" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kurti 3D — Sociedade Zé &amp; Kurt. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4">
          <SocialIcons />
          <p className="text-xs text-muted-foreground">Feito com filamento multicor.</p>
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
