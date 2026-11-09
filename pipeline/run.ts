/**
 * Nightly build: fetch official open data, link it, and write static JSON to public/data.
 * Run with `pnpm pipeline`. Upload with `pnpm pipeline:upload`.
 */
import { rmSync } from "node:fs";
import { orgShard } from "../src/lib/shard";
import type {
  FeedItem,
  Meeting,
  Membership,
  MepDossier,
  MepSummary,
  Meta,
  OrgDossier,
  OrgRef,
  OrgSummary,
  SearchDoc,
  SourceRef,
  VoteRecord,
} from "../src/lib/types";
import { buildMoney } from "./money";
import {
  commissionMeetings,
  type EpBody,
  type EpMembership,
  epBodies,
  epCurrentMeps,
  epDetails,
  howTheyVote,
  iwMeetings,
  register,
} from "./sources";
import { log, norm, OUT, slug, writeOut } from "./util";
import { buildVlaams } from "./vlaams";

const TERM_START = "2024-07-16";
const now = new Date();
const today = now.toISOString().slice(0, 10);
const yearAgo = new Date(now.getTime() - 365 * 86400_000).toISOString().slice(0, 10);

const cap = (s: string) =>
  s
    .toLowerCase()
    .split(/(\s|-|')/)
    .map((p) => (p.length > 1 ? p[0]?.toUpperCase() + p.slice(1) : p))
    .join("");

const tail = (uri?: string) => (uri ? (uri.split("/").pop() ?? uri) : "");

function kindOf(m: EpMembership): Membership["kind"] {
  const c = tail(m.membershipClassification);
  if (c === "EU_POLITICAL_GROUP") return "group";
  if (c === "NATIONAL_POLITICAL_GROUP") return "party";
  if (c.startsWith("COMMITTEE_PARLIAMENTARY")) return "committee";
  if (c.startsWith("DELEGATION")) return "delegation";
  if (c === "EU_INSTITUTION") return "parliament";
  return "other";
}

const isCurrent = (m: EpMembership) => !m.memberDuring?.endDate || m.memberDuring.endDate >= today;
const inTerm = (m: EpMembership) => !m.memberDuring?.endDate || m.memberDuring.endDate >= TERM_START;

const GROUPS: Record<string, string> = {
  PPE: "EPP",
  "S&D": "S&D",
  PfE: "Patriots for Europe",
  ECR: "ECR",
  Renew: "Renew Europe",
  "Verts/ALE": "Greens/EFA",
  "The Left": "The Left",
  NI: "Non-attached",
  ESN: "Europe of Sovereign Nations",
};

function bodyNames(b: EpBody | undefined, kind: Membership["kind"]): Membership["names"] {
  if (!b?.altLabel || (kind !== "committee" && kind !== "delegation")) return {};
  const out: Membership["names"] = {};
  for (const l of ["nl", "fr", "en"] as const) {
    const v = b.altLabel[l];
    if (v && v !== b.label) out[l] = v;
  }
  return out;
}

function isoDate(ddmmyyyy: string) {
  const [d, m, y] = ddmmyyyy.split("-");
  return y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : ddmmyyyy;
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });

  /* 1. Members */
  const current = await epCurrentMeps();
  log("current MEPs", current.length);
  const ids = current.map((p) => p.identifier);
  const details = await epDetails(ids);
  const bodyIds = new Set<string>();
  for (const d of details.values()) for (const m of d.hasMembership ?? []) if (inTerm(m)) bodyIds.add(m.organization);
  const bodies = await epBodies(bodyIds);

  /* 2. Meetings */
  const iw = await iwMeetings();
  log("meetings in source", iw.meetings.length);
  const reg = await register();
  log("register orgs", reg.orgs.size);
  const regByName = new Map<string, string>();
  for (const o of reg.orgs.values()) regByName.set(o.name.toLowerCase(), o.id);

  const resolveOrg = (raw: string): OrgRef => {
    const name = raw.trim();
    const rid = iw.match[name] || iw.match[`"${name}"`] || regByName.get(name.toLowerCase()) || null;
    const r = rid ? reg.orgs.get(rid) : undefined;
    return { id: rid ?? `n-${slug(name)}`, name: r?.name ?? name, registerId: rid };
  };

  const idSet = new Set(ids);
  const meetingsByMep = new Map<string, Meeting[]>();
  for (const m of iw.meetings) {
    if (!idSet.has(m.epid)) continue;
    const date = isoDate(m.date);
    if (date > today || date < "2019-07-01") continue;
    const seen = new Set<string>();
    const orgs: OrgRef[] = [];
    for (const n of m.lobbyistsArray ?? []) {
      if (!n?.trim()) continue;
      const o = resolveOrg(n);
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      orgs.push(o);
    }
    if (!orgs.length) continue;
    let arr = meetingsByMep.get(m.epid);
    if (!arr) meetingsByMep.set(m.epid, (arr = []));
    arr.push({
      date,
      title: m.title?.trim() ?? "",
      capacity: m.role || null,
      committee: m.committees?.length ? m.committees.join(", ") : null,
      procedure: m.dossier || null,
      orgs,
    });
  }
  for (const arr of meetingsByMep.values()) arr.sort((a, b) => b.date.localeCompare(a.date));

  /* 3. Votes */
  const htv = await howTheyVote(idSet, TERM_START);
  log("votes this term", htv.votes.size, "members with votes", htv.byMember.size);

  /* 4. Commission meetings */
  const ec = await commissionMeetings();
  log("commission meetings", ec.length);
  const ecByOrg = new Map<string, typeof ec>();
  for (const m of ec)
    for (const id of m.orgIds) {
      let arr = ecByOrg.get(id);
      if (!arr) ecByOrg.set(id, (arr = []));
      arr.push(m);
    }

  /* 5. Dossiers */
  const summaries: MepSummary[] = [];
  const dossiers: MepDossier[] = [];
  const epSrc: SourceRef = { key: "EP Open Data", url: "https://data.europarl.europa.eu" };
  const iwSrc: SourceRef = { key: "Integrity Watch EU", url: "https://www.integritywatch.eu/mepmeetings" };
  const htvSrc: SourceRef = { key: "HowTheyVote.eu", url: "https://howtheyvote.eu" };

  for (const p of current) {
    const id = p.identifier;
    const d = details.get(id);
    const mships = (d?.hasMembership ?? []).filter(inTerm);
    const given = d?.givenName ?? p.givenName ?? "";
    const family = d?.familyName ?? p.familyName ?? p.sortLabel ?? p.label;
    const name = given ? `${given} ${family}` : cap(p.label);
    const groupM = mships.find((m) => kindOf(m) === "group" && isCurrent(m));
    const partyM = mships.find((m) => kindOf(m) === "party" && isCurrent(m));
    const groupBody = groupM ? bodies.get(groupM.organization) : undefined;
    const since =
      (d?.hasMembership ?? [])
        .filter((m) => tail(m.role) === "MEMBER_PARLIAMENT" && m.memberDuring?.startDate)
        .map((m) => m.memberDuring?.startDate as string)
        .sort()[0] ?? null;

    const memberships: Membership[] = mships
      .filter((m) => ["group", "party", "committee", "delegation"].includes(kindOf(m)))
      .map((m) => {
        const kind = kindOf(m);
        const role = tail(m.role);
        const body = bodies.get(m.organization);
        return {
          kind,
          label: body?.label ?? tail(m.organization),
          names: bodyNames(body, kind),
          role: role === "MEMBER" ? null : role,
          start: m.memberDuring?.startDate ?? null,
          end: m.memberDuring?.endDate ?? null,
        };
      })
      .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
    const committees = [
      ...new Set(
        mships
          .filter((m) => kindOf(m) === "committee" && isCurrent(m) && tail(m.role) !== "MEMBER_SUBSTITUTE")
          .map((m) => bodies.get(m.organization)?.label ?? tail(m.organization)),
      ),
    ];

    const meetings = meetingsByMep.get(id) ?? [];
    const meetings12m = meetings.filter((m) => m.date >= yearAgo).length;
    const orgCount = new Map<string, { id: string; name: string; count: number }>();
    for (const m of meetings.filter((x) => x.date >= TERM_START))
      for (const o of m.orgs) {
        const c = orgCount.get(o.id) ?? { id: o.id, name: o.name, count: 0 };
        c.count++;
        orgCount.set(o.id, c);
      }
    const topOrgs = [...orgCount.values()].sort((a, b) => b.count - a.count).slice(0, 12);

    const mv = htv.byMember.get(id) ?? [];
    let votes: MepDossier["votes"] = null;
    if (mv.length) {
      const c = { FOR: 0, AGAINST: 0, ABSTENTION: 0, DID_NOT_VOTE: 0 } as Record<string, number>;
      for (const v of mv) c[v.position] = (c[v.position] ?? 0) + 1;
      const recent: VoteRecord[] = mv
        .map((v) => ({ v, meta: htv.votes.get(v.voteId) }))
        .filter((x) => x.meta?.isMain)
        .sort((a, b) => (b.meta?.timestamp ?? "").localeCompare(a.meta?.timestamp ?? ""))
        .slice(0, 120)
        .map(({ v, meta }) => ({
          id: v.voteId,
          date: (meta?.timestamp ?? "").slice(0, 10),
          title: meta?.title ?? "",
          position: (["FOR", "AGAINST", "ABSTENTION"].includes(v.position)
            ? v.position
            : "DID_NOT_VOTE") as VoteRecord["position"],
          result: meta?.result === "ADOPTED" || meta?.result === "REJECTED" ? meta.result : null,
          url: `https://howtheyvote.eu/votes/${v.voteId}`,
        }));
      votes = {
        total: mv.length,
        present: mv.length - (c.DID_NOT_VOTE ?? 0),
        for: c.FOR ?? 0,
        against: c.AGAINST ?? 0,
        abstention: c.ABSTENTION ?? 0,
        recent,
      };
    }

    const summary: MepSummary = {
      id,
      name,
      sort: family,
      country: p["api:country-of-representation"] ?? "",
      group: p["api:political-group"] ?? null,
      groupLabel: GROUPS[p["api:political-group"] ?? ""] ?? groupBody?.altLabel?.en ?? groupBody?.label ?? null,
      party: partyM ? (bodies.get(partyM.organization)?.label ?? null) : null,
      photo: `https://www.europarl.europa.eu/mepphoto/${id}.jpg`,
      meetings12m,
      meetingsTotal: meetings.length,
      attendance: votes ? Math.round((votes.present / votes.total) * 1000) / 1000 : null,
    };
    const upper = `${given} ${family}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    summaries.push(summary);
    dossiers.push({
      ...summary,
      since,
      committees,
      memberships,
      meetings,
      topOrgs,
      votes,
      links: {
        ep: `https://www.europarl.europa.eu/meps/en/${id}/${upper}`,
        declarations: `https://www.europarl.europa.eu/meps/en/${id}/${upper}/declarations`,
      },
      sources: [epSrc, iwSrc, htvSrc],
    });
  }
  summaries.sort((a, b) => a.sort.localeCompare(b.sort));

  /* 6. Organisations */
  type Agg = {
    ref: OrgRef;
    meetings: number;
    meetings12m: number;
    beMeetings: number;
    meps: Map<string, number>;
    recent: (Meeting & { mepId: string; mepName: string })[];
  };
  const agg = new Map<string, Agg>();
  const mepById = new Map(summaries.map((s) => [s.id, s]));
  const feed: FeedItem[] = [];
  for (const [mepId, list] of meetingsByMep) {
    const mep = mepById.get(mepId);
    if (!mep) continue;
    for (const m of list) {
      if (m.date >= yearAgo)
        feed.push({
          kind: "meeting",
          date: m.date,
          mepId,
          mepName: mep.name,
          country: mep.country,
          title: m.title,
          orgs: m.orgs,
        });
      if (m.date < TERM_START) continue;
      for (const o of m.orgs) {
        let a = agg.get(o.id);
        if (!a)
          agg.set(o.id, (a = { ref: o, meetings: 0, meetings12m: 0, beMeetings: 0, meps: new Map(), recent: [] }));
        a.meetings++;
        if (m.date >= yearAgo) a.meetings12m++;
        if (mep.country === "BE") a.beMeetings++;
        a.meps.set(mepId, (a.meps.get(mepId) ?? 0) + 1);
        a.recent.push({ ...m, mepId, mepName: mep.name });
      }
    }
  }
  feed.sort((a, b) => b.date.localeCompare(a.date));

  const orgSummaries: OrgSummary[] = [];
  const shards = new Map<string, Record<string, OrgDossier>>();
  for (const a of agg.values()) {
    const r = a.ref.registerId ? reg.orgs.get(a.ref.registerId) : undefined;
    const s: OrgSummary = {
      id: a.ref.id,
      name: a.ref.name,
      registerId: a.ref.registerId,
      meetings: a.meetings,
      meetings12m: a.meetings12m,
      meps: a.meps.size,
      beMeetings: a.beMeetings,
      category: r?.category ?? null,
    };
    orgSummaries.push(s);
    const ecm = a.ref.registerId ? (ecByOrg.get(a.ref.registerId) ?? []) : [];
    const dossier: OrgDossier = {
      ...s,
      register: r
        ? {
            id: r.id,
            category: r.category,
            country: r.country ? (toIso2(r.country) ?? cap(r.country)) : null,
            costMin: r.costMin,
            costMax: r.costMax,
            costYear: r.costYear,
            costKind: r.costKind,
            persons: r.persons,
            fte: r.fte,
            accreditations: r.accreditations,
            website: r.website,
            interests: r.interests,
            url: `https://transparency-register.europa.eu/searchregister-or-update/organisation-detail_en?id=${r.id}`,
          }
        : null,
      metMeps: [...a.meps.entries()]
        .map(([id, count]) => ({
          id,
          count,
          name: mepById.get(id)?.name ?? id,
          country: mepById.get(id)?.country ?? "",
        }))
        .sort((x, y) => y.count - x.count),
      recent: a.recent.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 40),
      commission: ecm.length
        ? {
            count: ecm.length,
            recent: ecm
              .sort((x, y) => y.date.localeCompare(x.date))
              .slice(0, 10)
              .map(({ date, who, subject }) => ({ date, who, subject: subject.slice(0, 240) })),
          }
        : null,
      sources: [
        iwSrc,
        ...(r ? [{ key: "Transparency Register", url: "https://transparency-register.europa.eu" }] : []),
      ],
    };
    const k = orgShard(s.id);
    let shard = shards.get(k);
    if (!shard) shards.set(k, (shard = {}));
    shard[s.id] = dossier;
  }
  orgSummaries.sort((a, b) => b.meetings - a.meetings);
  const listedOrgs = orgSummaries.filter((o) => o.meetings >= 3 || o.beMeetings >= 1);

  /* 7. Write */
  for (const d of dossiers) writeOut(`mep/${d.id}.json`, d);
  for (const [k, v] of shards) writeOut(`org/${k}.json`, v);
  writeOut("meps.json", summaries);
  writeOut("orgs.json", listedOrgs);
  writeOut("feed.json", feed.slice(0, 400));
  const search: SearchDoc[] = [
    ...summaries.map((m) => ({
      id: m.id,
      kind: "mep" as const,
      name: m.name,
      sub: [m.country, m.group, m.party].filter(Boolean).join(", "),
    })),
    ...listedOrgs.map((o) => ({
      id: o.id,
      kind: "org" as const,
      name: o.name,
      sub: `${o.meetings} meetings${o.category ? `, ${o.category}` : ""}`,
    })),
  ];
  /* 8. Geldstroom */
  const lobbyByName = new Map<string, string>();
  for (const o of orgSummaries) if (o.registerId) lobbyByName.set(norm(o.name), o.id);
  const moneyRes = await buildMoney(lobbyByName);
  search.push(...moneyRes.search);

  /* 9. Vlaams Parlement */
  const vp = await buildVlaams();
  search.push(...vp.search);
  writeOut("search.json", search);
  const totalMeetings = [...meetingsByMep.values()].reduce((n, a) => n + a.length, 0);
  const meta: Meta = {
    generatedAt: now.toISOString(),
    counts: { meps: summaries.length, meetings: totalMeetings, orgs: orgSummaries.length, votes: htv.votes.size },
    sources: [
      {
        key: "ep",
        name: "European Parliament Open Data API",
        url: "https://data.europarl.europa.eu",
        licence: "Hergebruik toegestaan met bronvermelding (EP)",
        fetchedAt: now.toISOString(),
        records: summaries.length,
      },
      {
        key: "iw",
        name: "Integrity Watch EU, MEP meetings (Transparency International EU)",
        url: "https://www.integritywatch.eu/mepmeetings",
        licence: "ODbL 1.0, gebaseerd op de verklaringen van leden op europarl.europa.eu",
        fetchedAt: iw.lastModified ? new Date(iw.lastModified).toISOString() : now.toISOString(),
        records: totalMeetings,
      },
      {
        key: "register",
        name: "EU Transparency Register",
        url: "https://transparency-register.europa.eu",
        licence: "Hergebruik toegestaan (Besluit 2011/833/EU)",
        fetchedAt: reg.exportDate ?? now.toISOString(),
        records: reg.orgs.size,
      },
      {
        key: "htv",
        name: `HowTheyVote.eu (release ${htv.release})`,
        url: "https://howtheyvote.eu",
        licence: "ODbL 1.0",
        fetchedAt: now.toISOString(),
        records: htv.votes.size,
      },
      ...moneyRes.meta,
      vp.meta,
      {
        key: "ec",
        name: "European Commission, meetings with interest representatives",
        url: "https://data.europa.eu/data/datasets/european-commission-meetings-with-interest-representatives",
        licence: "CC BY 4.0",
        fetchedAt: now.toISOString(),
        records: ec.length,
      },
    ],
  };
  writeOut("meta.json", meta);
  log("done", {
    meps: summaries.length,
    orgs: orgSummaries.length,
    listed: listedOrgs.length,
    feed: feed.length,
    shards: shards.size,
  });
}

const COUNTRIES: Record<string, string> = {
  BELGIUM: "BE",
  FRANCE: "FR",
  GERMANY: "DE",
  NETHERLANDS: "NL",
  LUXEMBOURG: "LU",
  ITALY: "IT",
  SPAIN: "ES",
  PORTUGAL: "PT",
  IRELAND: "IE",
  "UNITED KINGDOM": "GB",
  "UNITED STATES": "US",
  AUSTRIA: "AT",
  DENMARK: "DK",
  SWEDEN: "SE",
  FINLAND: "FI",
  POLAND: "PL",
  "CZECH REPUBLIC": "CZ",
  CZECHIA: "CZ",
  SLOVAKIA: "SK",
  HUNGARY: "HU",
  ROMANIA: "RO",
  BULGARIA: "BG",
  GREECE: "GR",
  CYPRUS: "CY",
  MALTA: "MT",
  SLOVENIA: "SI",
  CROATIA: "HR",
  ESTONIA: "EE",
  LATVIA: "LV",
  LITHUANIA: "LT",
  SWITZERLAND: "CH",
  NORWAY: "NO",
  JAPAN: "JP",
  CHINA: "CN",
  CANADA: "CA",
  AUSTRALIA: "AU",
  ISRAEL: "IL",
  TURKEY: "TR",
  TÜRKIYE: "TR",
  UKRAINE: "UA",
  INDIA: "IN",
  "SOUTH KOREA": "KR",
  "KOREA, REPUBLIC OF": "KR",
  ICELAND: "IS",
};
const toIso2 = (c: string) => COUNTRIES[c.toUpperCase()] ?? null;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
