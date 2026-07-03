import { z } from "zod";

export const siteTestimonialSchema = z.object({
  nome: z.string().min(1).max(200),
  cargo: z.string().min(1).max(200),
  texto: z.string().min(1).max(2000),
});

export const heroStatSchema = z.object({
  valor: z.string().min(1).max(50),
  label: z.string().min(1).max(50),
});

export const featureSchema = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().min(1).max(1000),
});

export const siteContentSchema = z.object({
  heroTitulo: z.string().min(1).max(500),
  heroSubtitulo: z.string().min(1).max(500),
  heroStats: z.array(heroStatSchema).min(1).max(10),
  features: z.array(featureSchema).min(1).max(20),
  instagramUrl: z.string().url().max(500),
  youtubeUrl: z.string().url().max(500),
  testimonials: z.array(siteTestimonialSchema).min(0).max(50),
});

export type SiteContentInput = z.infer<typeof siteContentSchema>;
