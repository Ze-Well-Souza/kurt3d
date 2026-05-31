import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowRight, Cpu, Layers, Zap } from "lucide-react";
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
      { title: "Filament Forge — Precision 3D Printing Studio" },
      { name: "description", content: "High-resolution FDM and resin 3D printing for prototypes, parts and custom builds." },
      { property: "og:title", content: "Filament Forge — Precision 3D Printing" },
      { property: "og:description", content: "High-resolution FDM and resin 3D printing for prototypes, parts and custom builds." },
    ],
  }),
  component: Landing,
});

const gallery = [
  { src: work1, alt: "Geometric lattice vase", span: "row-span-2" },
  { src: work2, alt: "Neon green gear assembly", span: "" },
  { src: work3, alt: "Articulated dragon figurine", span: "row-span-2" },
  { src: work4, alt: "Prosthetic hand prototype", span: "" },
  { src: work5, alt: "Architectural miniature", span: "" },
  { src: work6, alt: "Custom drone frame", span: "row-span-2" },
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Filament Forge</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#work" className="transition-colors hover:text-foreground">Our Work</a>
          <a href="#services" className="transition-colors hover:text-foreground">Services</a>
          <a href="#contact" className="transition-colors hover:text-foreground">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="sm">Admin</Button>
          </Link>
          <a href="#contact"><Button size="sm">Get a quote</Button></a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-glow)" }} />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-32">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Now printing — 24/7 farm online
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tighter md:text-7xl">
            Precision parts,<br />
            <span className="text-primary">printed perfectly.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            High-resolution FDM and resin printing for prototypes, production parts, and one-off creations. Sub-millimeter tolerances, next-day turnaround.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact"><Button size="lg" className="gap-2">Start a project <ArrowRight className="h-4 w-4" /></Button></a>
            <a href="#work"><Button size="lg" variant="outline">View portfolio</Button></a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              { k: "0.05mm", v: "Layer height" },
              { k: "<24h", v: "Turnaround" },
              { k: "12+", v: "Materials" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-2xl font-bold text-primary">{s.k}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 opacity-40 blur-3xl" />
          <img
            src={heroImg}
            alt="3D printer producing a neon green lattice sphere"
            width={1920}
            height={1280}
            className="aspect-[4/3] w-full rounded-2xl border border-border object-cover shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Cpu, title: "Engineering grade", desc: "Carbon fiber, PEEK, ABS — parts that survive real loads." },
    { icon: Zap, title: "Lightning turnaround", desc: "Most jobs ship within 24 hours of approval." },
    { icon: Layers, title: "Multi-material", desc: "Combine rigid and flexible materials in a single print." },
  ];
  return (
    <section id="services" className="border-y border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section id="work" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-primary">Portfolio</div>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Our work</h2>
        </div>
        <p className="hidden max-w-sm text-sm text-muted-foreground md:block">
          A small sample of the parts, models and prototypes printed in our studio.
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
    <section id="contact" className="border-t border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-primary">Contact</div>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Got a part in mind?
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Send us your STL or just a sketch — we'll come back with a quote and timeline within a day.
          </p>
          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex gap-3"><dt className="w-20 text-muted-foreground">Email</dt><dd>hello@filamentforge.io</dd></div>
            <div className="flex gap-3"><dt className="w-20 text-muted-foreground">Studio</dt><dd>Brooklyn, NY</dd></div>
            <div className="flex gap-3"><dt className="w-20 text-muted-foreground">Hours</dt><dd>Mon–Fri · 9–6</dd></div>
          </dl>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success("Message sent — we'll reply within 24h.");
              (e.target as HTMLFormElement).reset();
            }, 600);
          }}
          className="rounded-2xl border border-border bg-card p-6 md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required placeholder="Ada Lovelace" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="ada@studio.com" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project">Project</Label>
            <Textarea id="project" required rows={5} placeholder="Tell us about the part, material, quantity…" />
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
            {loading ? "Sending…" : "Send message"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Filament Forge. All rights reserved.</p>
        <p>Crafted with neon green filament.</p>
      </div>
    </footer>
  );
}
