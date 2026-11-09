/**
 * Data contract between the pipeline (pipeline/*) and the app.
 * Everything is static JSON, produced nightly and served from Vercel Blob.
 */

export type SourceRef = {
  /** Short key, e.g. "ep-api", "ep-meetings", "howtheyvote", "register" */
  key: string;
  url: string;
};

export type MepSummary = {
  id: string;
  name: string;
  /** Family name for sorting */
  sort: string;
  country: string;
  group: string | null;
  groupLabel: string | null;
  party: string | null;
  photo: string;
  meetings12m: number;
  meetingsTotal: number;
  attendance: number | null;
};

export type OrgRef = {
  /** Stable id: register id when known, else a slug of the name */
  id: string;
  name: string;
  registerId: string | null;
};

export type Meeting = {
  date: string;
  title: string;
  /** e.g. "Rapporteur", "Shadow rapporteur", "Committee chair", "Member" */
  capacity: string | null;
  committee: string | null;
  procedure: string | null;
  orgs: OrgRef[];
};

export type VoteRecord = {
  id: string;
  date: string;
  title: string;
  position: "FOR" | "AGAINST" | "ABSTENTION" | "DID_NOT_VOTE";
  /** Overall outcome */
  result: "ADOPTED" | "REJECTED" | null;
  url: string | null;
};

export type Membership = {
  kind: "group" | "party" | "committee" | "delegation" | "parliament" | "other";
  label: string;
  /** Full body name per language, when the EP provides one */
  names: Partial<Record<"nl" | "fr" | "en", string>>;
  role: string | null;
  start: string | null;
  end: string | null;
};

export type MepDossier = MepSummary & {
  since: string | null;
  committees: string[];
  memberships: Membership[];
  meetings: Meeting[];
  topOrgs: { id: string; name: string; count: number }[];
  votes: {
    total: number;
    present: number;
    for: number;
    against: number;
    abstention: number;
    recent: VoteRecord[];
  } | null;
  links: { ep: string; declarations: string };
  sources: SourceRef[];
};

export type OrgSummary = {
  id: string;
  name: string;
  registerId: string | null;
  meetings: number;
  meetings12m: number;
  meps: number;
  beMeetings: number;
  category: string | null;
};

export type OrgDossier = OrgSummary & {
  register: {
    id: string;
    category: string | null;
    country: string | null;
    costMin: number | null;
    costMax: number | null;
    costYear: string | null;
    costKind: "lobby" | "total" | null;
    persons: number | null;
    fte: number | null;
    accreditations: number | null;
    website: string | null;
    interests: string[];
    url: string;
  } | null;
  metMeps: { id: string; name: string; country: string; count: number }[];
  recent: (Meeting & { mepId: string; mepName: string })[];
  commission: { count: number; recent: { date: string; who: string; subject: string }[] } | null;
  sources: SourceRef[];
};

export type FeedItem = {
  kind: "meeting";
  date: string;
  mepId: string;
  mepName: string;
  country: string;
  title: string;
  orgs: OrgRef[];
};

export type Meta = {
  generatedAt: string;
  counts: { meps: number; meetings: number; orgs: number; votes: number };
  sources: { key: string; name: string; url: string; licence: string; fetchedAt: string; records: number }[];
};

export type SearchDoc = {
  id: string;
  kind: "mep" | "org" | "recipient" | "vp";
  name: string;
  sub: string;
};

/* ---------------- Geldstroom (phase 2) ---------------- */

export type MoneyFlow = {
  source: "fts" | "kohesio";
  year: string;
  amount: number;
  programme: string | null;
  dept: string | null;
  subject: string | null;
  url: string | null;
};

export type TedAward = {
  id: string;
  date: string;
  buyer: string;
  buyerId: string;
  winners: { id: string; name: string }[];
  /** Notice total value. Can be the maximum of a framework agreement, not money spent. */
  value: number | null;
  cpv: string | null;
};

export type RecipientSummary = {
  id: string;
  name: string;
  kbo: string | null;
  city: string | null;
  /** EU money committed (FTS) plus EU co-financing (Kohesio) */
  eu: number;
  flows: number;
  won: number;
  awarded: number;
  lobbyId: string | null;
};

export type RecipientDossier = RecipientSummary & {
  byYear: { year: string; amount: number }[];
  byProgramme: { name: string; amount: number }[];
  topFlows: MoneyFlow[];
  contractsWon: TedAward[];
  contractsAwarded: TedAward[];
  awardedValue: number;
  sources: SourceRef[];
};

export type MoneyOverview = {
  generatedAt: string;
  fts: {
    years: { year: string; amount: number; count: number; excluded: number }[];
    byDept: { name: string; amount: number }[];
  };
  kohesio: {
    periods: { period: string; eu: number; total: number; count: number }[];
    byFund: { name: string; amount: number }[];
    byProvince: { code: string; amount: number; count: number }[];
  };
  ted: {
    count: number;
    from: string;
    byBuyer: { id: string; name: string; count: number; value: number }[];
    byWinner: { id: string; name: string; count: number }[];
  };
  topRecipients: RecipientSummary[];
};

/* ---------------- Vlaams Parlement (phase 3) ---------------- */

export type VpSummary = {
  /** "vp-<id>" */
  id: string;
  name: string;
  sort: string;
  party: string;
  partyColor: string | null;
  district: string;
  plenaryPresent: number | null;
  plenaryExcused: number | null;
  questions: number | null;
  otherMandates: number;
  /** Share of named plenary votes in which the member voted */
  voteAttendance: number | null;
};

export type VpDossier = VpSummary & {
  since: string | null;
  committees: { code: string; title: string; role: string; start: string | null }[];
  mandates: { group: string; title: string; start: string | null; end: string | null }[];
  career: { title: string; employer: string | null; start: string | null; end: string | null }[];
  votes: {
    total: number;
    present: number;
    for: number;
    against: number;
    abstention: number;
    recent: VoteRecord[];
  } | null;
  links: { vp: string };
  sources: SourceRef[];
};
