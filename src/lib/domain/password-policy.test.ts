import { describe, expect, it } from "vitest";
import { getPasswordPolicyIssues, getPasswordPolicyMessage } from "./password-policy";

describe("password-policy", () => {
  it("aceita senha com maiuscula, minuscula e numero", () => {
    expect(getPasswordPolicyIssues("Senha123")).toEqual([]);
    expect(getPasswordPolicyMessage("Senha123")).toBeNull();
  });

  it("aponta exatamente os requisitos ausentes", () => {
    expect(getPasswordPolicyIssues("senha")).toEqual(["min_length", "uppercase", "number"]);
    expect(getPasswordPolicyMessage("senha")).toContain("ter pelo menos 8 caracteres");
    expect(getPasswordPolicyMessage("senha")).toContain("letra maiuscula");
    expect(getPasswordPolicyMessage("senha")).toContain("um numero");
  });
});
