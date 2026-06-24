import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers env binds at REQUEST time; read process.env inside
// the function (not at module scope).

export function getServerConfig() {
  const required = (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required env var: ${name}`);
    }
    return value;
  };

  return {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    appSessionSecret: required("APP_SESSION_SECRET"),
  };
}
