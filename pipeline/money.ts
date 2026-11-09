/**
 * Phase 2, Geldstroom: EU money to Belgian recipients (FTS, Kohesio) and Belgian public contracts (TED).
 */
import { readFileSync } from "node:fs";
import { ORG_SHARDS, recipientShard } from "../src/lib/shard";
import type {
  MoneyFlow,
  MoneyOverview,
  RecipientDossier,
  RecipientSummary,
  SourceRef,
  TedAward,
} from "../src/lib/types";
import { cached, csvObjects, fetchRetry, kbo, log, money, norm, slug, writeOut } from "./util";

const FTS_YEARS = ["2023", "2024", "2025"];

/**
 * Not Belgian recipients: EU bodies seated in Brussels, and natural persons (privacy).
 * Their total is reported separately so nothing disappears silently.
 */
const FTS_EXCLUDED_TYPES = new Set([
  "EU Joint Undertakings and PPP",
  "EU Institution & Bodies",
  "EU executive agencies",
  "EC entities not consolidated",
  "International Organisations",
  "Private Persons",
]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Entity = {
  id: string;
  name: string;
  kbo: string | null;
  city: string | null;
  flows: MoneyFlow[];
  won: TedAward[];
  awarded: TedAward[];
};

export type MoneyMeta = {
  key: string;
  name: string;
  url: string;
  licence: string;
  fetchedAt: string;
  records: number;
}[];

export async function buildMoney(
  lobbyByName: Map<string, string>,
): Promise<{ meta: MoneyMeta; search: { id: string; kind: "recipient"; name: string; sub: string }[] }> {
  const entities = new Map<string, Entity>();
  const byName = new Map<string, string>();

  const entity = (name: string, k: string | null, city: string | null): Entity => {
    const clean = (name.split("*")[0] || name).trim().replace(/\s+/g, " ");
    const id = k ?? byName.get(norm(clean)) ?? `n-${slug(clean)}`;
    let e = entities.get(id);
    if (!e) {
      e = { id, name: clean, kbo: k, city, flows: [], won: [], awarded: [] };
      entities.set(id, e);
    }
    if (!byName.has(norm(clean))) byName.set(norm(clean), id);
    if (!e.city && city) e.city = city;
    return e;
  };

  /* FTS */
  const ftsYears: MoneyOverview["fts"]["years"] = [];
  const byDept = new Map<string, number>();
  let ftsRows = 0;
  for (const y of FTS_YEARS) {
    let path: string;
    try {
      path = await cached(
        `fts/${y}.csv`,
        `https://ec.europa.eu/budget/financial-transparency-system/download/${y}_FTS_dataset_en.csv`,
        24 * 30,
      );
    } catch (e) {
      log("FTS year unavailable", y, String(e));
      continue;
    }
    const buf = readFileSync(path);
    const isUtf8 = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = new TextDecoder(isUtf8 ? "utf-8" : "windows-1252").decode(buf);
    let amount = 0;
    let count = 0;
    let excluded = 0;
    for (const r of csvObjects(text)) {
      if (r["Beneficiary country"] !== "Belgium") continue;
      const a = money(r["Beneficiary’s contracted amount (EUR)"]);
      if (!a) continue;
      if (FTS_EXCLUDED_TYPES.has(r["Beneficiary type"] ?? "")) {
        excluded += a;
        continue;
      }
      const name = r["Name of beneficiary"] ?? "";
      if (!name) continue;
      const k = kbo(r["VAT number of beneficiary"]) ?? kbo(r["Main registration number of beneficiary"]);
      const city = r.City ? r.City.trim() : null;
      const e = entity(name, k, city ? city[0] + city.slice(1).toLowerCase() : null);
      const dept = r["Responsible department"] || null;
      e.flows.push({
        source: "fts",
        year: r.Year || y,
        amount: a,
        programme: r["Programme name"] || r["Budget line name"] || null,
        dept,
        subject: (r["Subject of grant or contract"] || "").slice(0, 200) || null,
        url: null,
      });
      amount += a;
      count++;
      if (dept) byDept.set(dept, (byDept.get(dept) ?? 0) + a);
    }
    ftsRows += count;
    ftsYears.push({ year: y, amount: Math.round(amount), count, excluded: Math.round(excluded) });
    log("FTS", y, count, "rows", Math.round(amount / 1e6), "M EUR");
  }

  /* Kohesio */
  const periods: MoneyOverview["kohesio"]["periods"] = [];
  const byFund = new Map<string, number>();
  const byProvince = new Map<string, { amount: number; count: number }>();
  let kohRows = 0;
  for (const [period, file] of [
    ["2021-2027", "projects-2021-2027/latest/BE-pp21-27-latest.csv"],
    ["2014-2020", "projects-2014-2020/latest/BE-pp14-20-latest.csv"],
  ] as const) {
    const path = await cached(
      `kohesio/${period}.csv`,
      `https://kohesio.ec.europa.eu/api/data/object?id=data/${file}`,
      24 * 7,
    );
    let eu = 0;
    let total = 0;
    let count = 0;
    for (const r of csvObjects(readFileSync(path, "utf8"))) {
      const a = money(r.Project_EU_Budget);
      const tot = money(r.Total_Eligible_Expenditure_amount);
      count++;
      total += tot;
      if (!a) continue;
      eu += a;
      const names = (r.Beneficiary_Name || "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const share = a / Math.max(1, names.length);
      const qid = (r.Operation_Unique_Identifier || "").split("/").pop();
      for (const n of names) {
        const e = entity(n, names.length === 1 ? kbo(r.Beneficiary_Local_Identifier) : null, r.LAU_Labels || null);
        e.flows.push({
          source: "kohesio",
          year: (r.Operation_Start_Date || "").slice(-4),
          amount: share,
          programme: r.Programme_Name || null,
          dept: r.Fund_Name || null,
          subject: (r.Operation_Name_Programme_Language || r.Operation_Name_English || "").slice(0, 200) || null,
          url: qid ? `https://kohesio.ec.europa.eu/en/projects/${qid}` : null,
        });
      }
      const fund = r.Fund_Name || r.Fund_Code || "?";
      byFund.set(fund, (byFund.get(fund) ?? 0) + a);
      const nuts2 = (r.NUTS2_Code || r.NUTS3_Code || "").slice(0, 4);
      if (nuts2.startsWith("BE")) {
        const p = byProvince.get(nuts2) ?? { amount: 0, count: 0 };
        p.amount += a;
        p.count++;
        byProvince.set(nuts2, p);
      }
    }
    kohRows += count;
    periods.push({ period, eu: Math.round(eu), total: Math.round(total), count });
    log("Kohesio", period, count, "projects", Math.round(eu / 1e6), "M EUR EU");
  }

  /* TED: award notices with a Belgian buyer, last 12 months */
  const since = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10).replace(/-/g, "");
  const awards: TedAward[] = [];
  let token: string | null = null;
  const first = (o: unknown): string => {
    if (!o || typeof o !== "object") return "";
    for (const l of ["nld", "fra", "eng", "deu"]) {
      const v = (o as Record<string, string[]>)[l];
      if (v?.[0]) return v[0];
    }
    const any = Object.values(o as Record<string, string[]>)[0];
    return any?.[0] ?? "";
  };
  const all = (o: unknown): string[] => {
    if (!o || typeof o !== "object") return [];
    for (const l of ["nld", "fra", "eng", "deu"]) {
      const v = (o as Record<string, string[]>)[l];
      if (v?.length) return v;
    }
    return Object.values(o as Record<string, string[]>)[0] ?? [];
  };
  for (let page = 0; page < 60; page++) {
    const body = {
      query: `buyer-country=BEL AND form-type=result AND publication-date>=${since} SORT BY publication-date DESC`,
      fields: [
        "publication-number",
        "publication-date",
        "buyer-name",
        "winner-name",
        "total-value",
        "classification-cpv",
      ],
      limit: 250,
      paginationMode: "ITERATION",
      ...(token ? { iterationNextToken: token } : {}),
    };
    let res: Response;
    try {
      res = await fetchRetry("https://api.ted.europa.eu/v3/notices/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      log("TED page failed", page, String(e));
      break;
    }
    if (!res.ok) {
      log("TED status", res.status);
      break;
    }
    const j = (await res.json()) as { notices?: Record<string, unknown>[]; iterationNextToken?: string | null };
    for (const n of j.notices ?? []) {
      const buyerName = first(n["buyer-name"]);
      if (!buyerName) continue;
      const winners = [
        ...new Set(
          all(n["winner-name"])
            .map((w) => w.trim())
            .filter(Boolean),
        ),
      ];
      const buyer = entity(buyerName, null, null);
      const a: TedAward = {
        id: String(n["publication-number"] ?? ""),
        date: String(n["publication-date"] ?? "").slice(0, 10),
        buyer: buyer.name,
        buyerId: buyer.id,
        winners: [],
        value: typeof n["total-value"] === "number" ? (n["total-value"] as number) : null,
        cpv: ((n["classification-cpv"] as string[] | undefined) ?? [])[0] ?? null,
      };
      for (const w of winners.slice(0, 12)) {
        const we = entity(w, null, null);
        a.winners.push({ id: we.id, name: we.name });
        we.won.push(a);
      }
      buyer.awarded.push(a);
      awards.push(a);
    }
    token = j.iterationNextToken ?? null;
    if (!token || !(j.notices ?? []).length) break;
    await sleep(1100);
  }
  log("TED awards", awards.length);

  /* Write */
  const summaries: RecipientSummary[] = [];
  const shards = new Map<string, Record<string, RecipientDossier>>();
  const srcFts: SourceRef = {
    key: "EU Financial Transparency System",
    url: "https://ec.europa.eu/budget/financial-transparency-system",
  };
  const srcKoh: SourceRef = { key: "Kohesio", url: "https://kohesio.ec.europa.eu" };
  const srcTed: SourceRef = { key: "TED", url: "https://ted.europa.eu" };
  for (const e of entities.values()) {
    const eu = e.flows.reduce((n, f) => n + f.amount, 0);
    const s: RecipientSummary = {
      id: e.id,
      name: e.name,
      kbo: e.kbo,
      city: e.city,
      eu: Math.round(eu),
      flows: e.flows.length,
      won: e.won.length,
      awarded: e.awarded.length,
      lobbyId: lobbyByName.get(norm(e.name)) ?? null,
    };
    summaries.push(s);
    const years = new Map<string, number>();
    const progs = new Map<string, number>();
    for (const f of e.flows) {
      years.set(f.year, (years.get(f.year) ?? 0) + f.amount);
      const p = f.programme ?? "?";
      progs.set(p, (progs.get(p) ?? 0) + f.amount);
    }
    const d: RecipientDossier = {
      ...s,
      byYear: [...years.entries()]
        .map(([year, amount]) => ({ year, amount: Math.round(amount) }))
        .sort((a, b) => a.year.localeCompare(b.year)),
      byProgramme: [...progs.entries()]
        .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 12),
      topFlows: [...e.flows].sort((a, b) => b.amount - a.amount).slice(0, 60),
      contractsWon: [...e.won].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60),
      contractsAwarded: [...e.awarded].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60),
      awardedValue: Math.round(e.awarded.reduce((n, a) => n + (a.value ?? 0), 0)),
      sources: [
        ...(e.flows.some((f) => f.source === "fts") ? [srcFts] : []),
        ...(e.flows.some((f) => f.source === "kohesio") ? [srcKoh] : []),
        ...(e.won.length || e.awarded.length ? [srcTed] : []),
      ],
    };
    const k = recipientShard(e.id);
    let shard = shards.get(k);
    if (!shard) shards.set(k, (shard = {}));
    shard[e.id] = d;
  }
  for (const [k, v] of shards) writeOut(`recipient/${k}.json`, v);

  const buyerAgg = new Map<string, { id: string; name: string; count: number; value: number }>();
  const winnerAgg = new Map<string, { id: string; name: string; count: number }>();
  for (const a of awards) {
    const b = buyerAgg.get(a.buyerId) ?? { id: a.buyerId, name: a.buyer, count: 0, value: 0 };
    b.count++;
    b.value += a.value ?? 0;
    buyerAgg.set(a.buyerId, b);
    for (const w of a.winners) {
      const x = winnerAgg.get(w.id) ?? { id: w.id, name: w.name, count: 0 };
      x.count++;
      winnerAgg.set(w.id, x);
    }
  }

  const overview: MoneyOverview = {
    generatedAt: new Date().toISOString(),
    fts: {
      years: ftsYears,
      byDept: [...byDept.entries()]
        .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 12),
    },
    kohesio: {
      periods,
      byFund: [...byFund.entries()]
        .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
        .sort((a, b) => b.amount - a.amount),
      byProvince: [...byProvince.entries()]
        .map(([code, v]) => ({ code, amount: Math.round(v.amount), count: v.count }))
        .sort((a, b) => b.amount - a.amount),
    },
    ted: {
      count: awards.length,
      from: `${since.slice(0, 4)}-${since.slice(4, 6)}-${since.slice(6, 8)}`,
      byBuyer: [...buyerAgg.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 25)
        .map((b) => ({ ...b, value: Math.round(b.value) })),
      byWinner: [...winnerAgg.values()].sort((a, b) => b.count - a.count).slice(0, 25),
    },
    topRecipients: [...summaries].sort((a, b) => b.eu - a.eu).slice(0, 300),
  };
  writeOut("money.json", overview);
  const search = [...summaries]
    .filter((s) => s.eu > 0 || s.won + s.awarded > 1)
    .sort((a, b) => b.eu - a.eu)
    .slice(0, 6000)
    .map((s) => ({
      id: s.id,
      kind: "recipient" as const,
      name: s.name,
      sub: [s.city, s.kbo].filter(Boolean).join(", "),
    }));
  log("money done", { entities: entities.size, shards: shards.size, ORG_SHARDS });

  const now = new Date().toISOString();
  const meta: MoneyMeta = [
    {
      key: "fts",
      name: "EU Financial Transparency System",
      url: "https://ec.europa.eu/budget/financial-transparency-system",
      licence: "CC BY 4.0",
      fetchedAt: now,
      records: ftsRows,
    },
    {
      key: "kohesio",
      name: "Kohesio, cohesiebeleid",
      url: "https://kohesio.ec.europa.eu",
      licence: "Hergebruik toegestaan (Europese Commissie)",
      fetchedAt: now,
      records: kohRows,
    },
    {
      key: "ted",
      name: "TED, gegunde overheidsopdrachten",
      url: "https://ted.europa.eu",
      licence: "CC BY 4.0",
      fetchedAt: now,
      records: awards.length,
    },
  ];
  return { meta, search };
}
