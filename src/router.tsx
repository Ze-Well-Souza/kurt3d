import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createQueryClient } from "./lib/query-client";

export const getRouter = () => {
  // Traz o onError global das mutações — sem ele, gravação recusada pelo
  // servidor falhava em silêncio na maior parte do painel (P1-1).
  const queryClient = createQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
