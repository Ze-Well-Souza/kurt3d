import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowRight, Cpu, Layers, Zap } from "lucide-react";
import { KurtiLogo } from "@/components/KurtiLogo";
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

const gallery = [
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
      <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
        {gallery.map((g) => (
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
    </section>
  );
}

function Contact() {
  const [loading, setLoading] = useState(false);
  return (
    <section id="contact" className="bg-card/50">
      <div className="filament-divider" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--filament-cyan)" }}>Contato</div>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Tem uma peça em mente?
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Envie seu STL ou apenas um esboço — retornamos com orçamento e prazo em até 24 horas.
          </p>
          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex gap-3"><dt className="w-24 text-muted-foreground">E-mail</dt><dd>contato@kurti3d.com.br</dd></div>
            <div className="flex gap-3"><dt className="w-24 text-muted-foreground">Estúdio</dt><dd>São Paulo, SP</dd></div>
            <div className="flex gap-3"><dt className="w-24 text-muted-foreground">Horário</dt><dd>Seg–Sex · 9h–18h</dd></div>
          </dl>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success("Mensagem enviada — responderemos em até 24h.");
              (e.target as HTMLFormElement).reset();
            }, 600);
          }}
          className="rounded-2xl border border-border bg-card p-6 md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" required placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required placeholder="voce@email.com" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project">Projeto</Label>
            <Textarea id="project" required rows={5} placeholder="Conte sobre a peça, material, quantidade…" />
          </div>
          <button type="submit" disabled={loading} className="btn-filament mt-6 inline-flex h-12 w-full items-center justify-center text-sm font-semibold disabled:opacity-60">
            {loading ? "Enviando…" : "Enviar mensagem"}
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
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Kurti 3D — Sociedade Zé &amp; Kurt. Todos os direitos reservados.</p>
        <p>Feito com filamento multicor.</p>
      </div>
    </footer>
  );
}
