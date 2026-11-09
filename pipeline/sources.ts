import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { cached, cachedJson, decodeXml, fetchRetry, log, parseCsvLine, pool, tag } from "./util";

const EP = "https://data.europarl.europa.eu/api/v2";
const LD = "format=application%2Fld%2Bjson";

/* ---------------- European Parliament Open Data API ---------------- */

type EpPerson = {
  identifier: string;
  label: string;
  familyName?: string;
  givenName?: string;
  sortLabel?: string;
  "api:country-of-representation"?: string;
  "api:political-group"?: string;
};

export type EpMembership = {
  organization: string;
  role?: string;
  membershipClassification?: string;
  memberDuring?: { startDate?: string; endDate?: string };
  represents?: string[];
};

export type EpDetail = EpPerson & { hasMembership?: EpMembership[] };

export type EpBody = {
  id: string;
  identifier: string;
  label: string;
  classification?: string;
  altLabel?: Record<string, string>;
};

export async function epCurrentMeps(): Promise<EpPerson[]> {
  const all: EpPerson[] = [];
  for (let offset = 0; offset < 2000; offset += 500) {
    const page = await cachedJson<{ data?: EpPerson[] }>(
      `ep/current-${offset}.json`,
      `${EP}/meps/show-current?${LD}&offset=${offset}&limit=500`,
    );
    const d = page.data ?? [];
    all.push(...d);
    if (d.length < 500) break;
  }
  return all;
}

export async function epDetails(ids: string[]): Promise<Map<string, EpDetail>> {
  const out = new Map<string, EpDetail>();
  let done = 0;
  await pool(ids, 6, async (id) => {
    try {
      const j = await cachedJson<{ data?: EpDetail[] }>(`ep/mep/${id}.json`, `${EP}/meps/${id}?${LD}`, 72);
      if (j.data?.[0]) out.set(id, j.data[0]);
    } catch (e) {
      log("mep detail failed", id, String(e));
    }
    if (++done % 100 === 0) log("mep details", done, "/", ids.length);
  });
  return out;
}

export async function epBodies(ids: Set<string>): Promise<Map<string, EpBody>> {
  const map = new Map<string, EpBody>();
  const list = [...ids].filter((id) => /^org\/\d+$/.test(id));
  log("resolving", list.length, "bodies");
  await pool(list, 6, async (id) => {
    try {
      const j = await cachedJson<{ data?: EpBody[] }>(
        `ep/body/${id.slice(4)}.json`,
        `${EP}/corporate-bodies/${id.slice(4)}?${LD}`,
        24 * 30,
      );
      if (j.data?.[0]) map.set(id, j.data[0]);
    } catch {
      /* unresolved body: shown by code */
    }
  });
  return map;
}

/* ---------------- Integrity Watch EU: MEP meetings (from EP declarations) ---------------- */

export type IwMeeting = {
  committees: string[];
  date: string; // dd-mm-yyyy
  dossier: string;
  epid: string;
  lobbyistsArray: string[];
  role: string;
  title: string;
};

const IW = "https://integritywatch.eu/autoupdate_data_eu/mepmeetings/latest";

export async function iwMeetings() {
  const meetings = await cachedJson<IwMeeting[]>("iw/mepmeetings.json", `${IW}/mepmeetings.json`);
  const match = await cachedJson<Record<string, string>>(
    "iw/tr_match.json",
    `${IW}/mepmeetings_lobbysts_tr_match.json`,
  );
  const head = await fetchRetry(`${IW}/mepmeetings.json`, { method: "HEAD" });
  return { meetings, match, lastModified: head.headers.get("last-modified") };
}

/* ---------------- EU Transparency Register ---------------- */

export type RegisterOrg = {
  id: string;
  name: string;
  acronym: string | null;
  category: string | null;
  country: string | null;
  website: string | null;
  persons: number | null;
  fte: number | null;
  accreditations: number | null;
  costMin: number | null;
  costMax: number | null;
  costYear: string | null;
  /** "lobby": declared EU lobbying costs. "total": NGOs report their total budget instead. */
  costKind: "lobby" | "total" | null;
  interests: string[];
};

const num = (s: string | null) => {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function register(): Promise<{ orgs: Map<string, RegisterOrg>; exportDate: string | null }> {
  const path = await cached(
    "register/organisations.xml",
    "https://ec.europa.eu/transparencyregister/public/files/ODP/download/XML/latest",
  );
  const xml = readFileSync(path, "utf8");
  const exportDate = tag(xml.slice(0, 2000), "exportDate");
  const orgs = new Map<string, RegisterOrg>();
  let i = 0;
  for (;;) {
    const start = xml.indexOf("<interestRepresentative>", i);
    if (start < 0) break;
    const end = xml.indexOf("</interestRepresentative>", start);
    const b = xml.slice(start, end);
    i = end + 10;
    const id = tag(b, "identificationCode");
    if (!id) continue;
    const closed = b.match(/<closedYear type="(\w+)">([\s\S]*?)<\/closedYear>/);
    let costMin: number | null = null;
    let costMax: number | null = null;
    let costYear: string | null = null;
    let costKind: RegisterOrg["costKind"] = null;
    if (closed && closed[1] !== "ClosedYearClientFinancialInformation") {
      const body = closed[2] ?? "";
      // Direct <costs> of the closed year (not the per-intermediary representationCosts)
      const costs = body.match(/<costs type="(\w+)"[^>]*>([\s\S]*?)<\/costs>/);
      const total = body.match(/<totalBudget type="(\w+)"[^>]*>([\s\S]*?)<\/totalBudget>/);
      const pick = costs ?? total;
      if (pick) {
        costKind = costs ? "lobby" : "total";
        if (pick[1] === "CostRange") {
          costMin = num(tag(pick[2] ?? "", "min"));
          costMax = num(tag(pick[2] ?? "", "max"));
        } else {
          costMin = costMax = num(tag(pick[2] ?? "", "absoluteCost"));
        }
      }
      const sd = tag(body, "startDate");
      const ed = tag(body, "endDate");
      costYear =
        sd && ed ? (sd.slice(0, 4) === ed.slice(0, 4) ? sd.slice(0, 4) : `${sd.slice(0, 4)}-${ed.slice(0, 4)}`) : null;
    }
    const head = b.match(/<headOffice>([\s\S]*?)<\/headOffice>/)?.[1] ?? "";
    const interests = [
      ...(b.match(/<interests>([\s\S]*?)<\/interests>/)?.[1] ?? "").matchAll(/<name>([\s\S]*?)<\/name>/g),
    ].map((m) => decodeXml(m[1] ?? ""));
    orgs.set(id, {
      id,
      name: tag(b, "originalName") ?? id,
      acronym: tag(b, "acronym"),
      category: tag(b, "registrationCategory"),
      country: tag(head, "country"),
      website: tag(b, "webSiteURL"),
      persons: num(b.match(/<members>([\d.]+)<\/members>/)?.[1] ?? null),
      fte: num(tag(b, "membersFTE")),
      accreditations: num(tag(b, "EPAccreditedNumber")),
      costMin,
      costMax,
      costYear,
      costKind,
      interests,
    });
  }
  return { orgs, exportDate };
}

/* ---------------- HowTheyVote.eu ---------------- */

export type HtvVote = {
  id: string;
  timestamp: string;
  title: string;
  isMain: boolean;
  result: string;
  reference: string;
};

export async function howTheyVote(memberIds: Set<string>, since: string) {
  const rel = await cachedJson<{ tag_name: string }>(
    "htv/latest.json",
    "https://api.github.com/repos/HowTheyVote/data/releases/latest",
    12,
  );
  const base = `https://github.com/HowTheyVote/data/releases/download/${rel.tag_name}`;
  const votesPath = await cached(`htv/${rel.tag_name}/votes.csv.gz`, `${base}/votes.csv.gz`, 24 * 7);
  const mvPath = await cached(`htv/${rel.tag_name}/member_votes.csv.gz`, `${base}/member_votes.csv.gz`, 24 * 7);

  const votes = new Map<string, HtvVote>();
  let header: string[] = [];
  for await (const line of createInterface({ input: createReadStream(votesPath).pipe(createGunzip()) })) {
    const cols = parseCsvLine(line);
    if (!header.length) {
      header = cols;
      continue;
    }
    const r = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]));
    if ((r.timestamp ?? "") < since) continue;
    votes.set(r.id ?? "", {
      id: r.id ?? "",
      timestamp: r.timestamp ?? "",
      title: r.display_title || r.procedure_title || r.description || "",
      isMain: r.is_main === "True" || r.is_main === "true" || r.is_main === "1",
      result: r.result ?? "",
      reference: r.reference ?? "",
    });
  }

  const byMember = new Map<string, { voteId: string; position: string }[]>();
  header = [];
  for await (const line of createInterface({ input: createReadStream(mvPath).pipe(createGunzip()) })) {
    const cols = parseCsvLine(line);
    if (!header.length) {
      header = cols;
      continue;
    }
    const voteId = cols[0] ?? "";
    const memberId = cols[1] ?? "";
    if (!memberIds.has(memberId) || !votes.has(voteId)) continue;
    let arr = byMember.get(memberId);
    if (!arr) byMember.set(memberId, (arr = []));
    arr.push({ voteId, position: cols[2] ?? "" });
  }
  return { votes, byMember, release: rel.tag_name };
}

/* ---------------- European Commission meetings with interest representatives ---------------- */

export type EcMeeting = { date: string; who: string; subject: string; orgIds: string[] };

export async function commissionMeetings(): Promise<EcMeeting[]> {
  const base = "https://ec.europa.eu/transparency-initiative/meetings/data/meetings/dataxml?name=";
  const files = [
    ["ec/commission2429.xml", `${base}meetingscommissionrepresentatives2429`],
    ["ec/dg.xml", `${base}meetingsdirectorgenerals`],
  ] as const;
  const out: EcMeeting[] = [];
  for (const [name, url] of files) {
    let xml: string;
    try {
      xml = readFileSync(await cached(name, url), "utf8");
    } catch (e) {
      log("commission source failed", name, String(e));
      continue;
    }
    for (const m of xml.matchAll(/<meeting>([\s\S]*?)<\/meeting>/g)) {
      const b = m[1] ?? "";
      const twice = (s: string | null) => (s ? decodeXml(s) : "");
      const orgIds = [...b.matchAll(/<entity>[\s\S]*?<id>([^<]+)<\/id>[\s\S]*?<\/entity>/g)].map((x) =>
        (x[1] ?? "").trim(),
      );
      out.push({
        date: tag(b, "date") ?? "",
        who: twice(tag(b, "cabinet") ?? (tag(b, "dgname") ? `DG ${tag(b, "dgname")}` : tag(b, "dgacronym"))),
        subject: twice(tag(b, "subject")),
        orgIds: [...new Set(orgIds)],
      });
    }
  }
  return out;
}
