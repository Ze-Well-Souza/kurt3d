import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppSettings } from "../../domain/types";
import { settingsRepo } from "../../server/repositories.server";

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await settingsRepo();
  return repo.settings;
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studioNome: z.string().trim().min(1).max(100),
      impressoraModelo: z.string().trim().min(1).max(100),
      consumoKw: z.number().min(0.001).max(100),
      tarifaEnergiaKwh: z.number().min(0.01).max(100),
      depreciacaoHora: z.number().min(0).max(1000),
      custoFixoUnidade: z.number().min(0).max(1000),
      defaultPesoRolo: z.number().min(1).max(100000),
      defaultQuantidade: z.number().int().min(1).max(100000),
      whatsappNumero: z.string().trim().max(30),
    }),
  )
  .handler(async ({ data }) => {
    const settings: AppSettings = {
      studioNome: data.studioNome,
      impressoraModelo: data.impressoraModelo,
      consumoKw: data.consumoKw,
      tarifaEnergiaKwh: data.tarifaEnergiaKwh,
      depreciacaoHora: data.depreciacaoHora,
      custoFixoUnidade: data.custoFixoUnidade,
      defaultPesoRolo: data.defaultPesoRolo,
      defaultQuantidade: data.defaultQuantidade,
      whatsappNumero: data.whatsappNumero,
    };
    const repo = await settingsRepo();
    await repo.save(settings);
    return { ok: true };
  });
