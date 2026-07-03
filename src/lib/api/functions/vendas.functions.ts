import { createServerFn } from "@tanstack/react-start";
import { vendasRepo } from "../../server/repositories.server";

export const listVendas = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await vendasRepo();
  return repo.list;
});
