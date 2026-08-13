import { beforeEach, describe, expect, it, vi } from "vitest";

// P0-4 — desativar um usuário precisa revogar a sessão dele na hora.
// Antes desta correção `requireSession()` só olhava o cookie, então uma conta
// desativada mantinha acesso total ao painel por até 30 dias (o maxAge do
// cookie). O teste trava o comportamento nos dois sentidos: ativo passa,
// inativo é rejeitado E tem o cookie limpo.

const sessionState: { data: { userId?: string; username?: string } } = { data: {} };
const clearMock = vi.fn(async () => {
  sessionState.data = {};
});

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://kurti3d.test/admin"),
  useSession: async () => ({
    get data() {
      return sessionState.data;
    },
    clear: clearMock,
    update: vi.fn(),
  }),
}));

const usersRepoMock = vi.fn();
vi.mock("./repositories.server", () => ({
  usersRepo: () => usersRepoMock(),
}));

vi.mock("../config.server", () => ({
  getServerConfig: () => ({
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceRoleKey: "service-role",
    appSessionSecret: "x".repeat(48),
  }),
}));

function withUsers(users: { id: string; active?: boolean }[]) {
  usersRepoMock.mockResolvedValue({
    list: users.map((u) => ({
      id: u.id,
      username: `user-${u.id}`,
      passwordHash: "scrypt:salt:key",
      role: "admin",
      mustChangePassword: false,
      active: u.active,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  });
}

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.data = {};
  });

  it("libera o acesso de um usuario ativo", async () => {
    const { requireSession } = await import("./require-session.server");
    sessionState.data = { userId: "u1", username: "zé" };
    withUsers([{ id: "u1", active: true }]);

    await expect(requireSession()).resolves.toBe("u1");
    expect(clearMock).not.toHaveBeenCalled();
  });

  it("trata usuario legado sem a coluna active como ativo", async () => {
    const { requireSession } = await import("./require-session.server");
    sessionState.data = { userId: "u1" };
    withUsers([{ id: "u1", active: undefined }]);

    await expect(requireSession()).resolves.toBe("u1");
  });

  it("rejeita e limpa a sessao de usuario desativado", async () => {
    const { requireSession } = await import("./require-session.server");
    sessionState.data = { userId: "u1" };
    withUsers([{ id: "u1", active: false }]);

    await expect(requireSession()).rejects.toThrow("unauthorized");
    expect(clearMock).toHaveBeenCalledOnce();
  });

  it("rejeita e limpa a sessao de usuario que nao existe mais", async () => {
    const { requireSession } = await import("./require-session.server");
    sessionState.data = { userId: "removido" };
    withUsers([{ id: "outro", active: true }]);

    await expect(requireSession()).rejects.toThrow("unauthorized");
    expect(clearMock).toHaveBeenCalledOnce();
  });

  it("rejeita quando nao ha sessao, sem consultar o banco", async () => {
    const { requireSession } = await import("./require-session.server");
    sessionState.data = {};
    withUsers([{ id: "u1", active: true }]);

    await expect(requireSession()).rejects.toThrow("unauthorized");
    expect(usersRepoMock).not.toHaveBeenCalled();
  });
});
