// Lógica pura (testável fora do React) para composição de mensagens
// de credenciais e URLs do WhatsApp usadas no compartilhamento de acesso.

export const DEFAULT_PROVISIONAL_PASSWORD = "Kurti-3D";

export type CredentialsPayload = {
  nome: string;
  phone: string;
  username: string;
  password: string;
};

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function buildCredentialsMessage(
  creds: CredentialsPayload,
  loginUrl: string,
): string {
  const login = creds.phone || creds.username;
  return (
    `Ola ${creds.nome || "admin"}! Seu acesso ao painel da Kurti 3D foi criado.\n\n` +
    `Acesse: ${loginUrl}\n` +
    `Login: ${login}\n` +
    `Senha provisoria: ${creds.password}\n\n` +
    `No primeiro acesso o sistema vai pedir para voce criar uma senha pessoal.`
  );
}

export function isProvisionalPasswordActive(mustChangePassword: boolean): boolean {
  return mustChangePassword === true;
}
