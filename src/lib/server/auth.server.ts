import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { nowIso } from "./db.server";
import { getServerConfig } from "../config.server";
import { usersRepo } from "./repositories.server";

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

export async function setupAdminUser(input: { username: string; password: string; phone?: string; nome?: string }) {
  const repo = await usersRepo();
  if (repo.list.length > 0) {
    throw new Error("setup_already_done");
  }
  const now = nowIso();
  const passwordHash = await hashPassword(input.password);
  const admin = {
    id: randomUUID(),
    username: input.username,
    passwordHash,
    phone: input.phone ?? null,
    nome: input.nome ?? null,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  };
  await repo.save([admin]);
  return { id: admin.id, username: admin.username };
}

export async function validateLogin(input: { phone: string; password: string }) {
  const repo = await usersRepo();
  const normalizedPhone = input.phone.replace(/\D/g, "");
  const user = repo.list.find(
    (u) => u.phone === normalizedPhone || u.phone === input.phone || u.username === input.phone,
  );
  if (!user) return null;
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, username: user.username, nome: user.nome };
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.id === userId);
  if (!user) throw new Error("user_not_found");
  user.passwordHash = await hashPassword(newPassword);
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
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
}

export async function createAdminUser(input: { username: string; password: string; phone?: string; nome?: string }) {
  const repo = await usersRepo();
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
  repo.list = repo.list.filter((u) => u.id !== userId);
  await repo.save(repo.list);
}

