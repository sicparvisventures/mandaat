/**
 * Phase 3: Vlaams Parlement. Members, committees, other mandates and attendance from the official open data API
 * (ws.vlpar.be, Modellicentie voor gratis hergebruik). Named plenary votes from the annex of the final
 * Handelingen PDFs. Private details (birth date, email, address) are deliberately not read into the output.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SearchDoc, SourceRef, VoteRecord, VpDossier, VpSummary } from "../src/lib/types";
import { cached, cachedJson, log, pool, RAW, slug, writeOut } from "./util";

const API = "https://ws.vlpar.be/e/opendata";
const LEGISLATURE_START = "2024-06-09";

type Fractie = { naam: string; kleur?: string };
type Current = {
  items: {
    volksvertegenwoordiger: { id: number; voornaam: string; naam: string; kieskring: string; fractie?: Fractie };
  }[];
};
type Detail = {
  id: number;
  voornaam: string;
  naam: string;
  kieskring?: string;
  huidigefractie?: Fractie;
  "aanwezigheden-huidige-legislatuur"?: { "plenaire-aanw"?: { aanwezig?: number; verontschuldigd?: number } };
  "mandaat-vlaams-parlement"?: {
    datumvan?: string;
    completepersoonsfunctie?: {
      commissie?: { afkorting?: string; titel?: string };
      omschrijving?: string;
      datumvan?: string;
      datumtot?: string;
    }[];
  }[];
  "mandaat-andere"?: {
    mandaatgroepnaam?: string;
    parlmandaat?: { mandaat: string; datumvan?: string; datumtot?: string }[];
  }[];
  beroep?: { titel: string; werkgever?: string; datumvan?: string; datumtot?: string }[];
};

const day = (s?: string) => (s ? s.slice(0, 10) : null);
export const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

type ParsedVote = {
  nr: number;
  title: string;
  result: "ADOPTED" | "REJECTED" | null;
  yes: string[];
  no: string[];
  abst: string[];
};

/** Parse the annex "Individuele stemmingen" plus vote titles from the body of a Handelingen text. */
export function parseHandelingen(text: string): ParsedVote[] {
  const lines = text
    .split(/\r?\n/)
    .filter(
      (l) => !/^\s*Vlaams Parlement\s*$/.test(l) && !/Plenaire vergadering nr\./.test(l) && !/^\s*\d{1,3}\s*$/.test(l),
    );
  const annexAt = lines.findLastIndex((l) =>
    /^Individuele stemmingen Vlaamse Volksvertegenwoordigers\s*$/.test(l.trim()),
  );
  if (annexAt < 0) return [];
  const body = lines.slice(0, annexAt);
  const annex = lines.slice(annexAt + 1);

  // Titles and results from the body: "Stemming nr. N" without colon.
  const meta = new Map<number, { title: string; result: ParsedVote["result"] }>();
  for (let i = 0; i < body.length; i++) {
    const m = body[i]?.trim().match(/^Stemming nr\. (\d+)$/);
    if (!m) continue;
    const nr = Number(m[1]);
    let title = "";
    for (let j = i - 1; j >= Math.max(0, i - 80); j--) {
      const idx = body[j]?.indexOf("stemming over ") ?? -1;
      if (idx >= 0) {
        const chunk = [body[j]?.slice(idx + "stemming over ".length) ?? "", ...body.slice(j + 1, i)].join(" ");
        // A sentence ends at a period followed by a capital letter or the end, not at "nr." or "c.s.".
        title = (chunk.split(/\.(?=\s+[A-Z]|\s*$)/)[0] ?? "")
          .replace(/\s+/g, " ")
          .replace(/(\p{L})- (\p{Ll}{3,})/gu, "$1$2")
          .trim();
        break;
      }
    }
    // The agenda heading above the vote, e.g. "ONTWERP VAN DECREET houdende ... – 925 (2025-2026)".
    let heading = "";
    for (let j = i - 1; j >= Math.max(0, i - 400); j--) {
      const l = body[j]?.trim() ?? "";
      if (/^(ONTWERP|ONTWERPEN|VOORSTEL|VOORSTELLEN|MOTIE|MOTIES|INTERPELLATIE)\b/.test(l)) {
        const parts = [l];
        for (let k = j + 1; k < Math.min(body.length, j + 8); k++) {
          const n = body[k]?.trim() ?? "";
          if (!n || n.startsWith("–") || n.startsWith("-")) break;
          parts.push(n);
        }
        const h = parts
          .join(" ")
          .replace(/\s+/g, " ")
          .replace(/(\p{L})- (\p{Ll}{3,})/gu, "$1$2");
        const m2 = h.match(/^([A-Z\s]+?)\s(?=\p{Ll})/u);
        heading = m2 ? (m2[1] ?? "").charAt(0) + (m2[1] ?? "").slice(1).toLowerCase() + h.slice(m2[1]?.length ?? 0) : h;
        break;
      }
    }
    if (heading && (!title || /^(Artikel|Amendement|Het amendement|De artikelen|Stemming)/i.test(title))) {
      title = title ? `${title}, ${heading.charAt(0).toLowerCase()}${heading.slice(1)}` : heading;
    }
    let result: ParsedVote["result"] = null;
    for (let j = i + 1; j < Math.min(body.length, i + 40); j++) {
      const l = body[j] ?? "";
      if (/Stemming nr\. \d+$/.test(l.trim())) break;
      if (/is aangenomen|zijn aangenomen|neemt .*\baan\b/.test(l)) {
        result = "ADOPTED";
        break;
      }
      if (/is verworpen|zijn verworpen|verwerpt/.test(l)) {
        result = "REJECTED";
        break;
      }
    }
    if (!meta.has(nr)) meta.set(nr, { title: title ? title[0]?.toUpperCase() + title.slice(1) : "", result });
  }

  const votes: ParsedVote[] = [];
  let cur: ParsedVote | null = null;
  let section: "yes" | "no" | "abst" | null = null;
  let buf = "";
  const flush = () => {
    if (cur && section && buf.trim()) {
      const names = buf
        .split(",")
        .map((n) => n.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      cur[section].push(...names);
    }
    buf = "";
  };
  for (const raw of annex) {
    const l = raw.trim();
    const sv = l.match(/^Stemming nr\. (\d+):$/);
    if (sv) {
      flush();
      section = null;
      const nr = Number(sv[1]);
      cur = { nr, title: meta.get(nr)?.title ?? "", result: meta.get(nr)?.result ?? null, yes: [], no: [], abst: [] };
      votes.push(cur);
      continue;
    }
    if (/^JA-stemmen:$/.test(l)) {
      flush();
      section = "yes";
      continue;
    }
    if (/^NEEN-stemmen:$/.test(l)) {
      flush();
      section = "no";
      continue;
    }
    if (/^ONTHOUDINGEN:$/.test(l)) {
      flush();
      section = "abst";
      continue;
    }
    if (!l) continue;
    if (!section) continue;
    buf += buf.endsWith("-") ? l : ` ${l}`;
  }
  flush();
  return votes;
}

async function plenaries(): Promise<{ id: number; date: string; pdf: string }[]> {
  const out: { id: number; date: string; pdf: string }[] = [];
  const start = new Date(LEGISLATURE_START);
  const end = new Date();
  for (let d = new Date(start); d < end; d.setMonth(d.getMonth() + 3)) {
    const to = new Date(Math.min(end.getTime(), new Date(d).setMonth(d.getMonth() + 3) - 86400_000));
    const fmt = (x: Date) =>
      `${String(x.getDate()).padStart(2, "0")}${String(x.getMonth() + 1).padStart(2, "0")}${x.getFullYear()}`;
    const name = `vp/verg-${fmt(d)}-${fmt(to)}.json`;
    const closed = to.getTime() < Date.now() - 30 * 86400_000;
    const j = await cachedJson<{
      items?: {
        vergadering: {
          id: number;
          datumbegin?: string;
          plenairehandelingen?: { isvoorlopigeversie?: boolean; pdffilewebpath?: string };
        };
      }[];
    }>(name, `${API}/verg/vorige?type=plen&datumvan=${fmt(d)}&datumtot=${fmt(to)}&limiet=100`, closed ? 24 * 365 : 20);
    for (const it of j.items ?? []) {
      const v = it.vergadering;
      const h = v.plenairehandelingen;
      if (!h?.pdffilewebpath || h.isvoorlopigeversie) continue;
      out.push({ id: v.id, date: day(v.datumbegin) ?? "", pdf: h.pdffilewebpath });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function buildVlaams(): Promise<{
  summaries: VpSummary[];
  search: SearchDoc[];
  meta: { key: string; name: string; url: string; licence: string; fetchedAt: string; records: number };
}> {
  const current = await cachedJson<Current>("vp/huidige.json", `${API}/vv/huidige`);
  const members = current.items.map((i) => i.volksvertegenwoordiger);
  log("VP members", members.length);
  const details = new Map<number, Detail>();
  await pool(members, 4, async (m) => {
    try {
      details.set(m.id, await cachedJson<Detail>(`vp/vv/${m.id}.json`, `${API}/vv/${m.id}?lang=nl`));
    } catch (e) {
      log("VP detail failed", m.id, String(e));
    }
  });

  // Written questions this legislature, via the search API (matches on "Naam, Voornaam").
  const questions = new Map<number, number>();
  await pool(members, 4, async (m) => {
    const q = encodeURIComponent(
      `inmeta:vraagsteller=${m.naam}, ${m.voornaam} inmeta:soort=SCHV inmeta:legislatuur=2024-2029`,
    );
    try {
      const j = await cachedJson<{ count?: string | number }>(
        `vp/q/${m.id}.json`,
        `https://ws.vlpar.be/api/search/query/${q}?collection=vp_collection&max=1`,
      );
      if (j.count != null) questions.set(m.id, Number(j.count));
    } catch {
      /* unknown */
    }
  });

  // Named votes
  const byName = new Map<string, number>();
  for (const m of members) byName.set(normName(`${m.voornaam} ${m.naam}`), m.id);
  const perMember = new Map<number, { rec: VoteRecord; pos: VoteRecord["position"] }[]>();
  const sessions = await plenaries();
  let parsedVotes = 0;
  let unmatched = 0;
  const hasPdftotext = (() => {
    try {
      execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();
  if (!hasPdftotext) log("pdftotext not found: skipping named votes");
  for (const s of hasPdftotext ? sessions : []) {
    let txt: string;
    try {
      const pdf = await cached(`vp/pdf/${s.id}.pdf`, s.pdf, 24 * 365);
      const txtPath = join(RAW, `vp/pdf/${s.id}.txt`);
      if (!existsSync(txtPath)) execFileSync("pdftotext", ["-enc", "UTF-8", pdf, txtPath]);
      txt = readFileSync(txtPath, "utf8");
    } catch (e) {
      log("VP pdf failed", s.id, String(e));
      continue;
    }
    for (const v of parseHandelingen(txt)) {
      parsedVotes++;
      const rec: Omit<VoteRecord, "position"> = {
        id: `${s.id}-${v.nr}`,
        date: s.date,
        title: v.title || `Stemming nr. ${v.nr}`,
        result: v.result,
        url: s.pdf,
      };
      const seen = new Set<number>();
      for (const [list, pos] of [
        [v.yes, "FOR"],
        [v.no, "AGAINST"],
        [v.abst, "ABSTENTION"],
      ] as const) {
        for (const n of list) {
          const key = normName(n);
          let ids: number[] = [];
          const exact = byName.get(key);
          if (exact != null) ids = [exact];
          // pdftotext sometimes glues two names together: find known full names inside the string.
          else if (key.length > 12) ids = [...byName.entries()].filter(([k]) => key.includes(k)).map(([, v]) => v);
          if (!ids.length) {
            unmatched++;
            continue;
          }
          for (const id of ids) {
            if (seen.has(id)) continue;
            seen.add(id);
            let arr = perMember.get(id);
            if (!arr) perMember.set(id, (arr = []));
            arr.push({ rec: { ...rec, position: pos }, pos });
          }
        }
      }
      for (const m of members) {
        if (seen.has(m.id)) continue;
        const start = day(details.get(m.id)?.["mandaat-vlaams-parlement"]?.[0]?.datumvan) ?? LEGISLATURE_START;
        if (s.date < start) continue;
        let arr = perMember.get(m.id);
        if (!arr) perMember.set(m.id, (arr = []));
        arr.push({ rec: { ...rec, position: "DID_NOT_VOTE" }, pos: "DID_NOT_VOTE" });
      }
    }
  }
  log("VP sessions", sessions.length, "named votes", parsedVotes, "unmatched names", unmatched);

  const summaries: VpSummary[] = [];
  const src: SourceRef[] = [
    {
      key: "Vlaams Parlement open data",
      url: "https://www.vlaamsparlement.be/nl/parlementair-werk/dossiers/dossiers/open-data",
    },
  ];
  for (const m of members) {
    const d = details.get(m.id);
    const party = d?.huidigefractie ?? m.fractie;
    const mandates = (d?.["mandaat-andere"] ?? []).flatMap((g) =>
      (g.parlmandaat ?? []).map((pm) => ({
        group: g.mandaatgroepnaam ?? "",
        title: pm.mandaat,
        start: day(pm.datumvan),
        end: day(pm.datumtot),
      })),
    );
    const committees = (d?.["mandaat-vlaams-parlement"]?.[0]?.completepersoonsfunctie ?? [])
      .filter((f) => !f.datumtot)
      .map((f) => ({
        code: f.commissie?.afkorting ?? "",
        title: f.commissie?.titel ?? "",
        role: f.omschrijving ?? "",
        start: day(f.datumvan),
      }));
    const pv = perMember.get(m.id) ?? [];
    const c = { FOR: 0, AGAINST: 0, ABSTENTION: 0, DID_NOT_VOTE: 0 } as Record<string, number>;
    for (const v of pv) c[v.pos] = (c[v.pos] ?? 0) + 1;
    const present = pv.length - (c.DID_NOT_VOTE ?? 0);
    const att = d?.["aanwezigheden-huidige-legislatuur"]?.["plenaire-aanw"];
    const id = `vp-${m.id}`;
    const s: VpSummary = {
      id,
      name: `${m.voornaam} ${m.naam}`,
      sort: m.naam,
      party: party?.naam ?? "",
      partyColor: party?.kleur ? `#${party.kleur.replace(/^#/, "")}` : null,
      district: (d?.kieskring ?? m.kieskring ?? "").replace(/^Kieskring /, ""),
      plenaryPresent: att?.aanwezig ?? null,
      plenaryExcused: att?.verontschuldigd ?? null,
      questions: questions.get(m.id) ?? null,
      otherMandates: mandates.filter((x) => !x.end).length,
      voteAttendance: pv.length ? Math.round((present / pv.length) * 1000) / 1000 : null,
    };
    summaries.push(s);
    const dossier: VpDossier = {
      ...s,
      since: day(d?.["mandaat-vlaams-parlement"]?.[0]?.datumvan),
      committees,
      mandates: mandates.sort((a, b) => (b.start ?? "").localeCompare(a.start ?? "")),
      career: (d?.beroep ?? [])
        .map((b) => ({ title: b.titel, employer: b.werkgever ?? null, start: day(b.datumvan), end: day(b.datumtot) }))
        .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? "")),
      votes: pv.length
        ? {
            total: pv.length,
            present,
            for: c.FOR ?? 0,
            against: c.AGAINST ?? 0,
            abstention: c.ABSTENTION ?? 0,
            recent: pv
              .map((v) => v.rec)
              .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
              .slice(0, 150),
          }
        : null,
      links: {
        vp: `https://www.vlaamsparlement.be/nl/vlaamse-volksvertegenwoordigers-het-vlaams-parlement/${slug(`${m.voornaam} ${m.naam}`)}`,
      },
      sources: src,
    };
    writeOut(`vp/${m.id}.json`, dossier);
  }
  summaries.sort((a, b) => a.sort.localeCompare(b.sort));
  writeOut("vp.json", summaries);
  return {
    summaries,
    search: summaries.map((s) => ({ id: s.id, kind: "vp", name: s.name, sub: `Vlaams Parlement, ${s.party}` })),
    meta: {
      key: "vp",
      name: "Vlaams Parlement, open data en Handelingen",
      url: "https://www.vlaamsparlement.be/nl/parlementair-werk/dossiers/dossiers/open-data",
      licence: "Modellicentie voor gratis hergebruik v1.0",
      fetchedAt: new Date().toISOString(),
      records: parsedVotes,
    },
  };
}
