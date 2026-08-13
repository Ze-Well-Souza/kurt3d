import { createFileRoute } from "@tanstack/react-router";
import { pingKeepAlive } from "@/lib/api/data.functions";

// Rota alvo do Cron da Vercel. O loader roda no servidor (SSR) e chama o
// serverFn que faz a consulta leve no Supabase, mantendo o banco ativo.
export const Route = createFileRoute("/keep-alive")({
  loader: async () => pingKeepAlive(),
  component: KeepAliveStatus,
});

function KeepAliveStatus() {
  const data = Route.useLoaderData();
  return (
    <pre style={{ padding: 16, fontFamily: "monospace" }}>{JSON.stringify(data, null, 2)}</pre>
  );
}
