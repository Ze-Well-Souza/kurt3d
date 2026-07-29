import { createServerFn } from "@tanstack/react-start";
import { vendasRepo } from "../../server/repositories.server";
import { requireSession } from "../../server/require-session.server";

export const listVendas = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  const repo = await vendasRepo();
  return repo.list;
});
