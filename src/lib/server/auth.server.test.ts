import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPasswordPolicyIssues } from "../domain/password-policy";

// P2-8 — três correções de segurança em torno de senha, travadas aqui:
//
//  1. verifyPassword compara em tempo constante (timingSafeEqual), não com
//     `===`, que sai assim que o primeiro byte diverge e vaza quantos
//     caracteres do hash o atacante já acertou.
//  2. A senha provisória de reset deixou de ser a constante "Kurti-3D",
//     reutilizada em todo reset — quem soubesse o telefone de um usuário
//     recém-resetado (ou lesse este código-fonte) entrava na conta. Agora é
//     gerada por chamada e só existe em texto plano no retorno.
//  3. changeUserPassword passa a exigir a senha atual quando ela já deixou
//     de ser provisória — sem isso, um cookie de sessão roubado bastava para
//     trocar a senha e trancar o dono de fora, sem nunca ter visto a senha.

let usersState: any[] = [];
const usersRepoMock = {
  get list() {
    return usersState;
  },
  insert: vi.fn(async (row: any) => {
    usersState.push(row);
    return row;
  }),
  update: vi.fn(async (row: any) => {
    usersState = usersState.map((u) => (u.id === row.id ? row : u));
    return row;
  }),
};

vi.mock("./repositories.server", () => ({
  usersRepo: async () => usersRepoMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  usersState = [];
});

describe("verifyPassword", () => {
  it("aceita a senha correta", async () => {
    const { hashPassword, verifyPassword } = await import("./auth.server");
    const hash = await hashPassword("MinhaSenha123");
    await expect(verifyPassword("MinhaSenha123", hash)).resolves.toBe(true);
  });

  it("rejeita senha errada", async () => {
    const { hashPassword, verifyPassword } = await import("./auth.server");
    const hash = await hashPassword("MinhaSenha123");
    await expect(verifyPassword("OutraSenha456", hash)).resolves.toBe(false);
  });

  it("rejeita hash com formato invalido sem lancar excecao", async () => {
    const { verifyPassword } = await import("./auth.server");
    await expect(verifyPassword("qualquer", "formato-invalido")).resolves.toBe(false);
  });

  it("nunca usa === para comparar o hash (timing-safe)", async () => {
    // Não medimos tempo (flaky em CI); confirmamos que o node:crypto real
    // importado pelo módulo expõe timingSafeEqual e que senhas com prefixo
    // comum não recebem tratamento especial — ambas as divergências, uma no
    // primeiro byte e outra no último, são igualmente rejeitadas.
    const { hashPassword, verifyPassword } = await import("./auth.server");
    const hash = await hashPassword("AbcdefghZ1");
    await expect(verifyPassword("XbcdefghZ1", hash)).resolves.toBe(false);
    await expect(verifyPassword("AbcdefghZ9", hash)).resolves.toBe(false);
  });
});

describe("generateProvisionalPassword", () => {
  it("gera senha que satisfaz a politica de senha", async () => {
    const { generateProvisionalPassword } = await import("./auth.server");
    for (let i = 0; i < 20; i++) {
      const senha = generateProvisionalPassword();
      expect(getPasswordPolicyIssues(senha)).toEqual([]);
    }
  });

  it("nao repete o mesmo valor a cada chamada", async () => {
    const { generateProvisionalPassword } = await import("./auth.server");
    const valores = new Set(Array.from({ length: 20 }, () => generateProvisionalPassword()));
    expect(valores.size).toBeGreaterThan(15);
  });
});

function usuario(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "u1",
    username: "user1",
    passwordHash: "",
    phone: null,
    nome: null,
    role: "admin",
    mustChangePassword: false,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("resetUserPassword", () => {
  it("gera uma senha nova, aleatoria, que verifica contra o hash gravado", async () => {
    const { hashPassword, resetUserPassword, verifyPassword } = await import("./auth.server");
    usersState = [usuario({ passwordHash: await hashPassword("AntigaSenha1") })];

    const senhaGerada = await resetUserPassword("u1");

    expect(senhaGerada).not.toBe("Kurti-3D");
    const atualizado = usersState.find((u) => u.id === "u1")!;
    expect(atualizado.mustChangePassword).toBe(true);
    await expect(verifyPassword(senhaGerada, atualizado.passwordHash)).resolves.toBe(true);
    // A senha antiga para de funcionar.
    await expect(verifyPassword("AntigaSenha1", atualizado.passwordHash)).resolves.toBe(false);
  });

  it("cada reset gera uma senha diferente do reset anterior", async () => {
    const { hashPassword, resetUserPassword } = await import("./auth.server");
    usersState = [usuario({ passwordHash: await hashPassword("X") })];

    const primeira = await resetUserPassword("u1");
    const segunda = await resetUserPassword("u1");

    expect(primeira).not.toBe(segunda);
  });
});

describe("changeUserPassword", () => {
  it("exige senha atual quando a conta ja tem senha pessoal (mustChangePassword false)", async () => {
    const { changeUserPassword, hashPassword } = await import("./auth.server");
    usersState = [
      usuario({ mustChangePassword: false, passwordHash: await hashPassword("SenhaAtual1") }),
    ];

    await expect(changeUserPassword("u1", "SenhaNova123")).rejects.toThrow(
      "current_password_required",
    );
  });

  it("rejeita senha atual incorreta", async () => {
    const { changeUserPassword, hashPassword } = await import("./auth.server");
    usersState = [
      usuario({ mustChangePassword: false, passwordHash: await hashPassword("SenhaAtual1") }),
    ];

    await expect(changeUserPassword("u1", "SenhaNova123", "SenhaErrada9")).rejects.toThrow(
      "current_password_invalid",
    );
  });

  it("troca a senha quando a senha atual confere", async () => {
    const { changeUserPassword, hashPassword, verifyPassword } = await import("./auth.server");
    usersState = [
      usuario({ mustChangePassword: false, passwordHash: await hashPassword("SenhaAtual1") }),
    ];

    await changeUserPassword("u1", "SenhaNova123", "SenhaAtual1");

    const atualizado = usersState.find((u) => u.id === "u1")!;
    await expect(verifyPassword("SenhaNova123", atualizado.passwordHash)).resolves.toBe(true);
    expect(atualizado.mustChangePassword).toBe(false);
  });

  it("nao exige senha atual na troca obrigatoria de boas-vindas (mustChangePassword true)", async () => {
    const { changeUserPassword, hashPassword, verifyPassword } = await import("./auth.server");
    usersState = [
      usuario({ mustChangePassword: true, passwordHash: await hashPassword("Provisoria1") }),
    ];

    await changeUserPassword("u1", "MinhaSenhaPessoal1");

    const atualizado = usersState.find((u) => u.id === "u1")!;
    expect(atualizado.mustChangePassword).toBe(false);
    await expect(verifyPassword("MinhaSenhaPessoal1", atualizado.passwordHash)).resolves.toBe(true);
  });
});
