import { queryOptions, useQuery } from "@tanstack/react-query";
import { orgShard } from "./shard";
import type { FeedItem, MepDossier, MepSummary, Meta, OrgDossier, OrgSummary, SearchDoc } from "./types";

export const DATA_BASE = (import.meta.env.VITE_DATA_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/data";

export class NotFoundError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${path}`);
  if (res.status === 404 || res.status === 403) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return (await res.json()) as T;
}

const DAY = 1000 * 60 * 60 * 24;

export const q = {
  meta: () => queryOptions({ queryKey: ["meta"], queryFn: () => getJson<Meta>("meta.json"), staleTime: DAY / 4 }),
  meps: () =>
    queryOptions({ queryKey: ["meps"], queryFn: () => getJson<MepSummary[]>("meps.json"), staleTime: DAY / 4 }),
  feed: () => queryOptions({ queryKey: ["feed"], queryFn: () => getJson<FeedItem[]>("feed.json"), staleTime: DAY / 4 }),
  orgs: () =>
    queryOptions({ queryKey: ["orgs"], queryFn: () => getJson<OrgSummary[]>("orgs.json"), staleTime: DAY / 4 }),
  search: () =>
    queryOptions({ queryKey: ["search"], queryFn: () => getJson<SearchDoc[]>("search.json"), staleTime: DAY / 4 }),
  mep: (id: string) =>
    queryOptions({ queryKey: ["mep", id], queryFn: () => getJson<MepDossier>(`mep/${id}.json`), staleTime: DAY / 4 }),
  org: (id: string) =>
    queryOptions({
      queryKey: ["org", id],
      queryFn: async () => {
        const shard = await getJson<Record<string, OrgDossier>>(`org/${orgShard(id)}.json`);
        const o = shard[id];
        if (!o) throw new NotFoundError(id);
        return o;
      },
      staleTime: DAY / 4,
    }),
};

export const useMeta = () => useQuery(q.meta());
export const useMeps = () => useQuery(q.meps());

/** EP official MEP photo. */
export const photoUrl = (id: string) => `https://www.europarl.europa.eu/mepphoto/${id}.jpg`;
