import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type JsonValue = unknown;

const DATA_DIR = join(process.cwd(), "data");

const writeLocks = new Map<string, Promise<void>>();

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function atomicWrite(path: string, contents: string) {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp`;
  await writeFile(tmp, contents, "utf-8");
  await rename(tmp, path);
}

export function nowIso() {
  return new Date().toISOString();
}

export function dataPath(name: string) {
  return join(DATA_DIR, name);
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T extends JsonValue>(path: string, value: T): Promise<void> {
  const prev = writeLocks.get(path) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(async () => {
      await atomicWrite(path, JSON.stringify(value, null, 2));
    });
  writeLocks.set(path, next);
  await next;
}

