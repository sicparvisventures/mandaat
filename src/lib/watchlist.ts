import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

const KEY = "mandaat.watchlist";
const listeners = new Set<(ids: string[]) => void>();
let cache: string[] | null = null;

async function load(): Promise<string[]> {
  if (cache) return cache;
  try {
    cache = ((await get(KEY)) as string[] | undefined) ?? [];
  } catch {
    cache = [];
  }
  return cache;
}

async function save(ids: string[]) {
  cache = ids;
  for (const l of listeners) l(ids);
  try {
    await set(KEY, ids);
  } catch {
    /* private mode: keep in memory */
  }
}

export function useWatchlist() {
  const [ids, setIds] = useState<string[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setIds(v));
    listeners.add(setIds);
    return () => {
      alive = false;
      listeners.delete(setIds);
    };
  }, []);
  const toggle = useCallback(async (id: string) => {
    const cur = await load();
    await save(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]);
  }, []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}
