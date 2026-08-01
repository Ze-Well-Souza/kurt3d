import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  buildCredentialsMessage,
  isProvisionalPasswordActive,
  DEFAULT_PROVISIONAL_PASSWORD,
  type CredentialsPayload,
} from "./auth-credentials";

describe("auth-credentials: buildWhatsAppUrl", () => {
  it("adiciona prefixo 55 para numero brasileiro com 11 digitos (DDD+9)", () => {
    const url = buildWhatsAppUrl("11967428594", "Olá");
    expect(url).toContain("wa.me/5511967428594");
  });

  it("adiciona prefixo 55 para numero com 10 digitos (fixo/antigo)", () => {
    const url = buildWhatsAppUrl("1134567890", "Msg");
    expect(url).toContain("wa.me/551134567890");
  });

  it("mantem pais ja presente (>=12 digitos nao adiciona 55 novamente)", () => {
    const url = buildWhatsAppUrl("5511967428594", "Msg");
    expect(url).toContain("wa.me/5511967428594");
    expect(url).not.toContain("wa.me/5555");
  });

  it("remove mascaras e caracteres nao numericos", () => {
    const url = buildWhatsAppUrl("(11) 96742-8594", "Olá");
    expect(url).toContain("wa.me/5511967428594");
  });

  it("codifica a mensagem na URL", () => {
    const url = buildWhatsAppUrl("11999999999", "Olá mundo!\nLinha 2");
    expect(url).toContain("text=");
    const textPart = url.split("text=")[1];
    expect(decodeURIComponent(textPart)).toBe("Olá mundo!\nLinha 2");
  });

  it("nao gera prefixo duplicado quando numero ja tem 55 e mascara", () => {
    const url = buildWhatsAppUrl("+55 (11) 96742-8594", "X");
    expect(url).toContain("wa.me/5511967428594");
  });
});

describe("auth-credentials: buildCredentialsMessage", () => {
  const baseCreds: CredentialsPayload = {
    nome: "Maria Silva",
    phone: "11967428594",
    username: "maria",
    password: "Senha123",
  };

  it("inclui nome saudado, login (phone) e senha provisoria", () => {
    const msg = buildCredentialsMessage(baseCreds, "https://kurti3d.com/login");
    expect(msg).toContain("Ola Maria Silva");
    expect(msg).toContain("Acesse: https://kurti3d.com/login");
    expect(msg).toContain("Login: 11967428594");
    expect(msg).toContain("Senha provisoria: Senha123");
    expect(msg).toContain("No primeiro acesso o sistema vai pedir");
  });

  it("usa username como login quando phone esta vazio", () => {
    const msg = buildCredentialsMessage(
      { ...baseCreds, phone: "" },
      "https://kurti3d.com/login",
    );
    expect(msg).toContain("Login: maria");
  });

  it("usa fallback 'admin' quando nome esta vazio", () => {
    const msg = buildCredentialsMessage(
      { ...baseCreds, nome: "" },
      "https://x.com",
    );
    expect(msg).toContain("Ola admin");
  });

  it("usa DEFAULT_PROVISIONAL_PASSWORD corretamente quando passado", () => {
    const msg = buildCredentialsMessage(
      { ...baseCreds, password: DEFAULT_PROVISIONAL_PASSWORD },
      "http://localhost:5173/login",
    );
    expect(msg).toContain(`Senha provisoria: ${DEFAULT_PROVISIONAL_PASSWORD}`);
  });
});

describe("auth-credentials: isProvisionalPasswordActive", () => {
  it("retorna true quando mustChangePassword e true", () => {
    expect(isProvisionalPasswordActive(true)).toBe(true);
  });

  it("retorna false quando mustChangePassword e false", () => {
    expect(isProvisionalPasswordActive(false)).toBe(false);
  });

  it("garante que nao e truthy (apenas true === true)", () => {
    // mustChangePassword pode vir como undefined em projections do repo;
    // essa funcao deixa claro que apenas boolean true conta.
    expect(isProvisionalPasswordActive(undefined as unknown as boolean)).toBe(false);
  });
});

describe("auth-credentials: DEFAULT_PROVISIONAL_PASSWORD invariant", () => {
  it("mantem o valor conhecido usado por auth.server.ts e resetPassword", () => {
    // Este teste trava o valor para evitar divergencia acidental entre
    // frontend (compartilhamento) e backend (reset da hash).
    expect(DEFAULT_PROVISIONAL_PASSWORD).toBe("Kurti-3D");
  });
});
