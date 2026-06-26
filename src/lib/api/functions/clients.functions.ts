import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Client } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { clientsRepo, ordersRepo } from "../../server/repositories.server";
import { relinkOrdersToClient } from "./shared";

export const addClient = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1, "Nome obrigatório").max(200),
      whatsapp: z.string().trim().max(30).nullable(),
      email: z.string().trim().max(200).nullable(),
      notas: z.string().trim().max(2000).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await clientsRepo();
    const now = nowIso();
    const client: Client = {
      id: randomUUID(),
      nome: data.nome,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? null,
      notas: data.notas ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await repo.save([client, ...repo.list]);
    const ordersData = await ordersRepo();
    const linkedOrders = relinkOrdersToClient(ordersData.list, client.id, [data.nome], now);
    await ordersData.save(linkedOrders);
    return { ok: true };
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      nome: z.string().trim().min(1).max(200),
      whatsapp: z.string().trim().max(30).nullable(),
      email: z.string().trim().max(200).nullable(),
      notas: z.string().trim().max(2000).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await clientsRepo();
    const existing = repo.list.find((client) => client.id === data.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    const now = nowIso();

    const updated: Client = {
      ...existing,
      nome: data.nome,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? null,
      notas: data.notas ?? null,
      updatedAt: now,
    };
    await repo.save(repo.list.map((client) => (client.id === data.id ? updated : client)));
    const ordersData = await ordersRepo();
    const linkedOrders = relinkOrdersToClient(ordersData.list, updated.id, [existing.nome, updated.nome], now);
    await ordersData.save(linkedOrders);
    return { ok: true as const };
  });

export const removeClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await clientsRepo();
    await repo.save(repo.list.filter((client) => client.id !== data.id));
    return { ok: true };
  });
