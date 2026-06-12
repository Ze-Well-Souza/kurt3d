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

export async function setupAdminUser(input: { username: string; password: string }) {
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
    createdAt: now,
    updatedAt: now,
  };
  await repo.save([admin]);
  return { id: admin.id, username: admin.username };
}

export async function validateLogin(input: { username: string; password: string }) {
  const repo = await usersRepo();
  const user = repo.list.find((u) => u.username === input.username);
  if (!user) return null;
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, username: user.username };
}

