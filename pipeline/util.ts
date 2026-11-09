import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const ROOT = new URL("..", import.meta.url).pathname;
export const RAW = join(ROOT, "data/raw");
export const OUT = join(ROOT, "public/data");

const UA = "Mandaat open-data pipeline (+https://github.com/sicparvisventures/mandaat)";

export const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchRetry(url: string, init: RequestInit = {}, tries = 4): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { "user-agent": UA, ...(init.headers ?? {}) } });
      if (res.ok) return res;
      if (res.status === 404) return res;
      last = new Error(`${res.status} ${url}`);
    } catch (e) {
      last = e;
    }
    await sleep(800 * 2 ** i);
  }
  throw last;
}

/** Download to data/raw with a max age, so local reruns don't hammer the sources. */
export async function cached(name: string, url: string, maxAgeH = 20): Promise<string> {
  const path = join(RAW, name);
  if (existsSync(path) && Date.now() - statSync(path).mtimeMs < maxAgeH * 3600_000) return path;
  mkdirSync(dirname(path), { recursive: true });
  log("download", name);
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

export async function cachedJson<T>(name: string, url: string, maxAgeH = 20): Promise<T> {
  return JSON.parse(readFileSync(await cached(name, url, maxAgeH), "utf8")) as T;
}

export async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i] as T, i);
      }
    }),
  );
  return out;
}

/** Minimal RFC 4180 CSV line parser (quotes, escaped quotes, commas). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/["'’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function writeOut(rel: string, data: unknown) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

export const sha1 = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");

export const decodeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

export const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m?.[1] != null ? decodeXml(m[1].trim()) : null;
};
