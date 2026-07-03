import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Client, Lead } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { syncLeadToCrm } from "../../server/lead-crm.server";
import { clientsRepo, leadsRepo, ordersRepo } from "../../server/repositories.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { requireSession } from "../../server/require-session.server";
import { uploadImagesToStorage } from "../../server/lead-image-upload.server";
import {
  buildLeadConversionNote,
  mergeNotes,
  normalizeClientName,
  normalizePhone,
  relinkOrdersToClient,
} from "./shared";

export const listLeads = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await leadsRepo();
  return repo.list;
});

export const submitLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1, "Nome obrigatório").max(200),
      whatsapp: z.string().trim().min(8, "WhatsApp obrigatório").max(30),
      mensagem: z.string().trim().min(1, "Mensagem obrigatória").max(5000),
      linkProjeto: z.string().trim().url("Link inválido").max(2000).optional(),
      imagens: z
        .array(
          z.object({
            nome: z.string().max(200),
            tipo: z.string().max(100),
            dataUrl: z.string().max(5_000_000),
          }),
        )
        .max(6)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    const repo = await leadsRepo();

    // Upload images to Supabase Storage — original base64 is NOT stored in DB
    let imagens: Lead["imagens"] = null;
    if (data.imagens && data.imagens.length > 0) {
      const uploaded = await uploadImagesToStorage(data.imagens);
      if (uploaded.length > 0) {
        imagens = uploaded.map((img) => ({
          nome: img.nome,
          tipo: img.tipo,
          publicUrl: img.publicUrl,
          storagePath: img.storagePath,
        }));
      }
    }

    const lead: Lead = {
      id: randomUUID(),
      nome: data.nome,
      whatsapp: data.whatsapp,
      mensagem: data.mensagem,
      linkProjeto: data.linkProjeto ?? null,
      imagens,
      createdAt: nowIso(),
    };
    await repo.insert(lead);
    await syncLeadToCrm(lead);
    return { ok: true, imagens: imagens ?? undefined };
  });

export const convertLeadToClient = createServerFn({ method: "POST" })
  .validator(z.object({ leadId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const [leadsData, clientsData, ordersData] = await Promise.all([leadsRepo(), clientsRepo(), ordersRepo()]);
    const lead = leadsData.list.find((item) => item.id === data.leadId);
    if (!lead) return { ok: false as const, reason: "not_found" as const };

    const normalizedLeadPhone = normalizePhone(lead.whatsapp);
    const normalizedLeadName = normalizeClientName(lead.nome);
    const note = buildLeadConversionNote(lead);
    const now = nowIso();

    const existingClient = clientsData.list.find((client) => {
      const samePhone = normalizedLeadPhone && normalizePhone(client.whatsapp) === normalizedLeadPhone;
      const sameName = normalizeClientName(client.nome) === normalizedLeadName;
      return samePhone || sameName;
    });

    if (existingClient) {
      const updatedClient: Client = {
        ...existingClient,
        whatsapp: existingClient.whatsapp ?? lead.whatsapp ?? null,
        notas: mergeNotes(existingClient.notas, note),
        updatedAt: now,
      };
      await clientsData.save(clientsData.list.map((client) => (client.id === existingClient.id ? updatedClient : client)));
      const linkedOrders = relinkOrdersToClient(ordersData.list, existingClient.id, [lead.nome, existingClient.nome], now);
      await ordersData.save(linkedOrders);
      return { ok: true as const, clientId: existingClient.id, created: false as const };
    }

    const client: Client = {
      id: randomUUID(),
      nome: lead.nome,
      whatsapp: lead.whatsapp ?? null,
      email: null,
      notas: note,
      createdAt: now,
      updatedAt: now,
    };
    await clientsData.save([client, ...clientsData.list]);
    const linkedOrders = relinkOrdersToClient(ordersData.list, client.id, [lead.nome], now);
    await ordersData.save(linkedOrders);
    return { ok: true as const, clientId: client.id, created: true as const };
  });
