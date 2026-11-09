/**
 * Upload public/data to Vercel Blob. Only files whose content changed since the last upload are sent,
 * tracked by a manifest stored next to the data.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { list, put } from "@vercel/blob";
import { log, OUT, pool, sha1 } from "./util";

const PREFIX = "data";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing");
  const files = walk(OUT);
  let prev: Record<string, string> = {};
  const existing = await list({ prefix: `${PREFIX}/manifest.json`, limit: 1 });
  if (existing.blobs[0]) {
    try {
      prev = (await (await fetch(`${existing.blobs[0].url}?t=${Date.now()}`)).json()) as Record<string, string>;
    } catch {
      prev = {};
    }
  }
  const next: Record<string, string> = {};
  const todo: { rel: string; body: Buffer }[] = [];
  for (const f of files) {
    const rel = relative(OUT, f);
    const body = readFileSync(f);
    const h = sha1(body);
    next[rel] = h;
    if (prev[rel] !== h) todo.push({ rel, body });
  }
  log("files", files.length, "changed", todo.length);
  let base = "";
  await pool(todo, 8, async ({ rel, body }) => {
    const short = rel === "meta.json" || rel === "feed.json" || rel === "meps.json";
    const res = await put(`${PREFIX}/${rel}`, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: short ? 300 : 3600,
    });
    base ||= res.url.slice(0, res.url.indexOf(`/${PREFIX}/`) + PREFIX.length + 1);
  });
  await put(`${PREFIX}/manifest.json`, JSON.stringify(next), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  log("uploaded", todo.length, base ? `base ${base}` : "");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
