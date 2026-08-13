import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { getPasswordPolicyMessage } from "../domain/password-policy";
import { nowIso } from "./db.server";
import { getServerConfig } from "../config.server";
import { usersRepo } from "./repositories.server";
import { normalizePhone } from "../utils/normalization";

const scryptAsync = promisify(scrypt);

type PasswordHash = {
  algo: "scrypt";
  salt: string;
  key: string;
};

function encodeHash(h: PasswordHash) {
  return `${h.algo}:${h.salt}:${h.key}`;
}

function decodeHash(raw: string): PasswordHash | null {
  const [algo, salt, key] = raw.split(":");
  if (algo !== "scrypt" || !salt || !key) return null;
  return { algo: "scrypt", salt, key };
}

export async function ensureSessionPassword(): Promise<string> {
  const secret = getServerConfig().appSessionSecret.trim();
  if (secret.length < 32) {
    throw new Error("APP_SESSION_SECRET precisa ter pelo menos 32 caracteres");
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return encodeHash({ algo: "scrypt", salt, key: key.toString("base64url") });
}

function assertPasswordPolicy(password: string) {
  const message = getPasswordPolicyMessage(password);
  if (message) throw new Error(message);
}

export async function verifyPassword(password: string, rawHash: string): Promise<boolean> {
  const decoded = decodeHash(rawHash);
  if (!decoded) return false;
  const key = (await scryptAsync(password, decoded.salt, 64)) as Buffer;
  return key.toString("base64url") === decoded.key;
}

export async function getAuthSetupState() {
  const repo = await usersRepo();
  return { hasAdmin: repo.list.length > 0 };
}

export async function getUserRole(userId: string): Promise<string | null> {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  return user?.role ?? null;
}

// Estado de acesso usado pelos guards de rota: papel + se a senha ainda é
// provisória (exige troca obrigatória antes de liberar o painel).
export async function getUserAuthInfo(
  userId: string,
): Promise<{ role: string | null; mustChangePassword: boolean } | null> {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) return null;
  return { role: user.role ?? null, mustChangePassword: user.mustChangePassword ?? false };
}

export async function setupAdminUser(input: {
  username: string;
  password: string;
  phone?: string;
  nome?: string;
}) {
  const repo = await usersRepo();
  if (repo.list.length > 0) {
    throw new Error("setup_already_done");
  }
  assertPasswordPolicy(input.password);
  const now = nowIso();
  const passwordHash = await hashPassword(input.password);
  const admin = {
    id: randomUUID(),
    username: input.username,
    passwordHash,
    phone: input.phone ?? null,
    nome: input.nome ?? null,
    // O primeiro usuário (setup) é o dono do sistema: super admin.
    role: "super_admin",
    // Ele escolhe a própria senha no setup — não precisa trocar depois.
    mustChangePassword: false,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await repo.save([admin]);
  return { id: admin.id, username: admin.username };
}

export async function validateLogin(input: { phone: string; password: string }) {
  const repo = await usersRepo();
  const normalizedPhone = normalizePhone(input.phone);
  const user = repo.list.find(
    (u) => u.phone === normalizedPhone || u.phone === input.phone || u.username === input.phone,
  );
  if (!user) return null;
  // Usuario inativo nao pode logar.
  if (user.active === false) return null;
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, username: user.username, nome: user.nome };
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) throw new Error("user_not_found");
  assertPasswordPolicy(newPassword);
  user.passwordHash = await hashPassword(newPassword);
  // Ao definir a senha pessoal, deixa de ser provisória: libera o painel.
  user.mustChangePassword = false;
  user.updatedAt = nowIso();
  await repo.save(repo.list);
}

export async function listAdminUsers() {
  const repo = await usersRepo();
  return repo.list.map((u) => ({
    id: u.id,
    username: u.username,
    phone: u.phone ?? null,
    nome: u.nome ?? null,
    role: u.role ?? "admin",
    mustChangePassword: u.mustChangePassword ?? false,
    active: u.active ?? true,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
}

export const DEFAULT_PROVISIONAL_PASSWORD = "Kurti-3D";

/** Reseta a senha de um usuario para a senha provisoria padrao e exige troca no proximo acesso. */
export async function resetUserPassword(userId: string) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) throw new Error("user_not_found");
  user.passwordHash = await hashPassword(DEFAULT_PROVISIONAL_PASSWORD);
  user.mustChangePassword = true;
  user.updatedAt = nowIso();
  await repo.save(repo.list);
}

export async function createAdminUser(input: {
  username: string;
  password: string;
  phone?: string;
  nome?: string;
}) {
  const repo = await usersRepo();
  assertPasswordPolicy(input.password);
  const now = nowIso();
  const passwordHash = await hashPassword(input.password);
  const exists = repo.list.find((u) => u.username === input.username);
  if (exists) throw new Error("username_exists");
  const existsPhone = input.phone ? repo.list.find((u) => u.phone === input.phone) : null;
  if (existsPhone) throw new Error("phone_exists");
  const user = {
    id: randomUUID(),
    username: input.username,
    passwordHash,
    phone: input.phone ?? null,
    nome: input.nome ?? null,
    role: "admin",
    // Senha cadastrada pelo super admin é provisória: troca obrigatória no 1º acesso.
    mustChangePassword: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  repo.list.push(user);
  await repo.save(repo.list);
  return { id: user.id, username: user.username };
}

export async function deleteAdminUser(userId: string) {
  const repo = await usersRepo();
  if (repo.list.length <= 1) throw new Error("cannot_delete_last_user");
  const target = repo.list.find((u) => u.id === userId);
  if (!target) throw new Error("user_not_found");
  if (target.role === "super_admin") throw new Error("cannot_delete_super_admin");
  repo.list = repo.list.filter((u) => u.id !== userId);
  await repo.save(repo.list);
}

/** Ativa ou desativa um usuario (soft-delete). Inativo = nao consegue logar. */
export async function setUserActive(userId: string, active: boolean) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) throw new Error("user_not_found");
  if (user.role === "super_admin" && !active) throw new Error("cannot_deactivate_super_admin");
  user.active = active;
  user.updatedAt = nowIso();
  await repo.save(repo.list);
}

/** Atualiza nome e/ou username de um usuario. */
export async function updateUser(userId: string, input: { nome?: string; username?: string }) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) throw new Error("user_not_found");
  if (input.username !== undefined) {
    const trimmed = input.username.trim();
    if (!trimmed) throw new Error("username_empty");
    const exists = repo.list.find((u) => u.username === trimmed && u.id !== userId);
    if (exists) throw new Error("username_exists");
    user.username = trimmed;
  }
  if (input.nome !== undefined) {
    user.nome = input.nome.trim() || null;
  }
  user.updatedAt = nowIso();
  await repo.save(repo.list);
}
