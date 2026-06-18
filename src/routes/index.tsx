import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowRight, Cpu, Layers, Zap, Instagram, Youtube, Play, MessageCircle } from "lucide-react";
import { listSnapshot, submitLead } from "@/lib/api/data.functions";
import { KurtiLogo } from "@/components/KurtiLogo";
import { usePortfolio } from "@/lib/store";
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
          <a href="#services" className="transition-colors hover:text-foreground">Serviços</a>
          <a href="#contact" className="transition-colors hover:text-foreground">Contato</a>
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
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--filament-green)" }} />
            Tecnologia Bambu Lab com AMS
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tighter md:text-7xl">
            Rápido. Colorido.<br />
            <span
              style={{
                backgroundImage: "var(--gradient-filament)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Perfeito.
            </span>{" "}
            <span className="text-foreground">Quem vê, curte!</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Sociedade Zé &amp; Kurt | Tecnologia Bambu Lab com AMS | Impressão multicor de alta qualidade
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="btn-filament inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold">
              Faça seu Orçamento <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#work"><Button size="lg" variant="outline">Ver portfólio</Button></a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 pt-6">
            {[
              { k: "0,05mm", v: "Camada", c: "var(--filament-cyan)" },
              { k: "<24h", v: "Entrega", c: "var(--filament-pink)" },
              { k: "12+", v: "Cores", c: "var(--filament-yellow)" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-2xl font-extrabold" style={{ color: s.c }}>{s.k}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
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
  const items = [
    { icon: Cpu, title: "Qualidade Bambu", desc: "Impressoras Bambu Lab com AMS para multicor pixel-perfect.", color: "var(--filament-cyan)" },
    { icon: Zap, title: "Entrega expressa", desc: "A maioria dos pedidos sai em até 24 horas.", color: "var(--filament-pink)" },
    { icon: Layers, title: "Multimaterial", desc: "PLA, PETG, ABS, TPU e filamentos especiais em qualquer cor.", color: "var(--filament-green)" },
  ];
  return (
    <section id="services" className="bg-card/50">
      <div className="filament-divider" />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
        {items.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: color }}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
      <div className="filament-divider" />
    </section>
  );
}

function Gallery() {
  const portfolio = usePortfolio();

  // If we have portfolio projects from the store, show them; otherwise fallback to static images
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
        <div className="grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4">
          {/* Video card placeholder — ready for MP4/Reels */}
          <VideoCard />

          {portfolio.map((p) => (
            <figure
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex h-full flex-col justify-between p-5">
                <div>
                  <Badge variant="secondary" className="mb-2">{p.categoria}</Badge>
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
              <div className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-t from-background/90 via-background/40 to-transparent transition-transform duration-500 group-hover:translate-y-0">
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-xs font-semibold filament-text">Kurtido com qualidade!</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.pesoPeca}g/un. · Filamento {p.pesoRolo}g
                  </p>
                </div>
              </div>
            </figure>
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

function Contact() {
  const [loading, setLoading] = useState(false);
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const whatsappNumero = snap.data?.settings?.whatsappNumero ?? "5511999999999";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nome = formData.get("name") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const mensagem = formData.get("project") as string;

    setLoading(true);
    try {
      await submitLead({ data: { nome, whatsapp, mensagem } });
      toast.success("Mensagem enviada — responderemos em até 24h.");
      form.reset();
      // Open WhatsApp with pre-formatted message
      const text = encodeURIComponent(`Olá! Meu nome é ${nome}.\n\n${mensagem}\n\n(WhatsApp: ${whatsapp})`);
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
  return (
    <div className={`items-center gap-1 ${className}`}>
      <a
        href="https://instagram.com/kurti3d"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Instagram className="h-4 w-4" />
      </a>
      <a
        href="https://youtube.com/@kurti3d"
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
