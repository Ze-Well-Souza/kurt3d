export function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeClientName(name: string) {
  return normalizeText(name);
}

export function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}
