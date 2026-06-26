export type PasswordPolicyIssue =
  | "min_length"
  | "uppercase"
  | "lowercase"
  | "number";

export const PASSWORD_POLICY_MIN_LENGTH = 8;

export function getPasswordPolicyIssues(password: string): PasswordPolicyIssue[] {
  const issues: PasswordPolicyIssue[] = [];

  if (password.length < PASSWORD_POLICY_MIN_LENGTH) issues.push("min_length");
  if (!/[A-Z]/.test(password)) issues.push("uppercase");
  if (!/[a-z]/.test(password)) issues.push("lowercase");
  if (!/[0-9]/.test(password)) issues.push("number");

  return issues;
}

export function getPasswordPolicyMessage(password: string) {
  const issues = getPasswordPolicyIssues(password);
  if (issues.length === 0) return null;

  const labels: Record<PasswordPolicyIssue, string> = {
    min_length: `ter pelo menos ${PASSWORD_POLICY_MIN_LENGTH} caracteres`,
    uppercase: "ter ao menos uma letra maiuscula",
    lowercase: "ter ao menos uma letra minuscula",
    number: "ter ao menos um numero",
  };

  return `A senha deve ${issues.map((issue) => labels[issue]).join(", ")}.`;
}
