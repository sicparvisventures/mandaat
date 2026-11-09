import { ArrowLeft, ArrowUpRight, FilePdf, Handshake, Info, Star } from "@phosphor-icons/react";
import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { IdCard } from "../components/IdCard";
import { EmptyState, ErrorState, PageSkeleton, RankList, SectionTitle, SourceStamp, Stat } from "../components/ui";
import { NotFoundError, q } from "../lib/data";
import { type Key, useI18n } from "../lib/i18n";
import type { MepDossier, VoteRecord } from "../lib/types";
import { useWatchlist } from "../lib/watchlist";
import { VpDossierPage } from "./VpDossier";

/** Net monthly salary of an MEP as reported by Euronews on 7 Oct 2026. Shown with its source on /bronnen. */
export const MEP_SALARY_NET_EUR = 8772.7;

export function DossierRoute() {
  const { id } = useParams({ strict: false }) as { id: string };
  if (id.startsWith("vp-")) return <VpDossierPage key={id} id={id} />;
  return <Dossier key={id} id={id} />;
}

export function Dossier({ id }: { id: string }) {
  const { t } = useI18n();
  const dossier = useQuery(q.mep(id));
  if (dossier.isPending) return <PageSkeleton />;
  if (dossier.isError) {
    if (dossier.error instanceof NotFoundError)
      return <EmptyState icon={<Info size={22} />} text={t("dossier.notFound")} />;
    return <ErrorState onRetry={() => dossier.refetch()} />;
  }
  return <DossierView d={dossier.data} />;
}

function DossierView({ d }: { d: MepDossier }) {
  const { t, locale, date } = useI18n();
  const watch = useWatchlist();
  const following = watch.has(d.id);
  const salary = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(MEP_SALARY_NET_EUR);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dossiers"
          className="press -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft size={15} weight="bold" aria-hidden />
          {t("dossier.back")}
        </Link>
        <button
          type="button"
          onClick={() => watch.toggle(d.id)}
          aria-pressed={following}
          className={`press inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${following ? "bg-stamp text-stamp-ink" : "card text-ink hover:text-stamp"}`}
        >
          <Star size={15} weight={following ? "fill" : "bold"} aria-hidden />
          {following ? t("dossier.following") : t("dossier.follow")}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="enter flex min-w-0 flex-col gap-3">
          <IdCard
            person={d}
            institution={t("card.institution")}
            since={d.since}
            fields={[
              [t("card.group"), d.groupLabel ?? d.group ?? "-"],
              [t("card.party"), d.party ?? "-"],
              [t("card.since"), d.since ? date(d.since) : "-"],
              [t("card.employer"), t("card.employerValue")],
              [t("card.salary"), salary],
            ]}
          />
          <div className="grid grid-cols-3 gap-2">
            <Stat value={d.meetings12m} label={t("dossier.meetings12")} />
            <Stat
              value={d.attendance == null ? "-" : `${Math.round(d.attendance * 100)}%`}
              label={t("dossier.attendance")}
            />
            <Stat
              value={d.committees.length}
              label={t(d.committees.length === 1 ? "dossier.committee" : "dossier.committees")}
            />
          </div>
        </div>

        <aside className="enter flex min-w-0 flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="card flex flex-col gap-4 p-4">
            <SectionTitle>{t("dossier.topOrgs")}</SectionTitle>
            {d.topOrgs.length > 0 ? (
              <RankList
                items={d.topOrgs.slice(0, 6).map((o) => ({
                  key: o.id,
                  label: o.name,
                  value: o.count,
                  to: (
                    <Link to="/lobby/$id" params={{ id: o.id }} className="font-medium hover:text-stamp">
                      {o.name}
                    </Link>
                  ),
                }))}
              />
            ) : (
              <p className="text-[13.5px] text-muted">{t("dossier.noMeetings")}</p>
            )}
            <SourceStamp href={`${d.links.ep}/meetings/past`}>europarl.europa.eu, meetings</SourceStamp>
          </div>
          <div className="flex gap-3 rounded-2xl bg-sunken p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-semibold">{t("dossier.howToRead")}</p>
              <p className="text-[13px] text-muted">{t("dossier.howToReadText")}</p>
            </div>
          </div>
        </aside>
      </div>

      <Tabs.Root defaultValue="meetings" className="flex flex-col gap-4">
        <Tabs.List className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {(
            [
              ["meetings", "dossier.tabMeetings", d.meetingsTotal],
              ["votes", "dossier.tabVotes", d.votes?.total ?? null],
              ["roles", "dossier.tabRoles", null],
              ["sources", "dossier.tabSources", null],
            ] as [string, Key, number | null][]
          ).map(([v, k, n]) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-[14px] font-semibold text-muted transition-[color,border-color] duration-150 hover:text-ink data-[state=active]:border-stamp data-[state=active]:text-ink"
            >
              {t(k)}
              {n != null && <span className="tnum ml-1.5 font-mono text-[11px] text-faint">{n}</span>}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="meetings">
          <Meetings d={d} />
        </Tabs.Content>
        <Tabs.Content value="votes">
          <Votes d={d} />
        </Tabs.Content>
        <Tabs.Content value="roles">
          <Roles d={d} />
        </Tabs.Content>
        <Tabs.Content value="sources">
          <Sources d={d} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Meetings({ d }: { d: MepDossier }) {
  const { t, date } = useI18n();
  const [limit, setLimit] = useState(25);
  if (d.meetings.length === 0) return <EmptyState icon={<Handshake size={22} />} text={t("dossier.noMeetings")} />;
  return (
    <div className="flex flex-col gap-3">
      <ol className="card divide-y divide-line overflow-hidden">
        {d.meetings.slice(0, limit).map((m, i) => (
          <li key={`${m.date}-${i}`} className="grid gap-1 p-3.5 sm:grid-cols-[96px_1fr] sm:gap-4">
            <time dateTime={m.date} className="tnum font-mono text-[12px] text-muted sm:pt-0.5">
              {date(m.date)}
            </time>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[14px] leading-snug">
                {m.orgs.map((o, j) => (
                  <span key={o.id}>
                    {j > 0 && ", "}
                    <Link to="/lobby/$id" params={{ id: o.id }} className="font-semibold hover:text-stamp">
                      {o.name}
                    </Link>
                  </span>
                ))}
              </p>
              {m.title && <p className="text-[13px] text-muted">{m.title}</p>}
              {(m.capacity || m.committee || m.procedure) && (
                <p className="font-mono text-[11px] text-faint">
                  {[m.capacity, m.committee, m.procedure].filter(Boolean).join("  /  ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {d.meetings.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 50)}
          className="press self-start rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
        >
          {t("dossier.showMore")}
        </button>
      )}
    </div>
  );
}

const POS: Record<VoteRecord["position"], { k: Key; cls: string }> = {
  FOR: { k: "dossier.for", cls: "text-good bg-good/12" },
  AGAINST: { k: "dossier.against", cls: "text-bad bg-bad/12" },
  ABSTENTION: { k: "dossier.abstention", cls: "text-warn bg-warn/12" },
  DID_NOT_VOTE: { k: "dossier.didNotVote", cls: "text-muted bg-sunken" },
};

function Votes({ d }: { d: MepDossier }) {
  const { t, date } = useI18n();
  const [limit, setLimit] = useState(25);
  if (!d.votes || d.votes.total === 0) return <EmptyState icon={<Info size={22} />} text={t("dossier.noVotes")} />;
  const v = d.votes;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={v.for} label={t("dossier.for")} />
        <Stat value={v.against} label={t("dossier.against")} />
        <Stat value={v.abstention} label={t("dossier.abstention")} />
        <Stat value={v.total - v.present} label={t("dossier.didNotVote")} />
      </div>
      <ol className="card divide-y divide-line overflow-hidden">
        {v.recent.slice(0, limit).map((r) => {
          const p = POS[r.position];
          return (
            <li key={r.id} className="grid gap-1.5 p-3.5 sm:grid-cols-[96px_1fr_auto] sm:items-baseline sm:gap-4">
              <time dateTime={r.date} className="tnum font-mono text-[12px] text-muted">
                {date(r.date)}
              </time>
              <p className="min-w-0 text-[14px] leading-snug">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-stamp">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
              </p>
              <span className={`justify-self-start rounded-md px-2 py-0.5 text-[12px] font-semibold ${p.cls}`}>
                {t(p.k)}
              </span>
            </li>
          );
        })}
      </ol>
      {v.recent.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 50)}
          className="press self-start rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
        >
          {t("dossier.showMore")}
        </button>
      )}
      <SourceStamp href="https://howtheyvote.eu">HowTheyVote.eu, EP roll-call votes</SourceStamp>
    </div>
  );
}

function Roles({ d }: { d: MepDossier }) {
  const { t, date, lang } = useI18n();
  const current = d.memberships.filter((m) => !m.end);
  const past = d.memberships.filter((m) => m.end);
  const row = (m: MepDossier["memberships"][number], i: number) => (
    <li key={`${m.label}-${i}`} className="grid gap-0.5 p-3.5 sm:grid-cols-[1fr_auto] sm:gap-4">
      <span className="min-w-0 text-[14px]">
        <span className="font-semibold">{m.label}</span>
        {(m.names[lang] ?? m.names.en) && <span className="text-muted"> {m.names[lang] ?? m.names.en}</span>}
        {m.role && <span className="text-muted">, {roleLabel(m.role, lang)}</span>}
      </span>
      <span className="tnum font-mono text-[11.5px] text-muted">
        {m.start ? date(m.start) : ""}
        {m.end ? ` - ${date(m.end)}` : ` - ${t("dossier.current")}`}
      </span>
    </li>
  );
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>{t("dossier.memberships")}</SectionTitle>
      <ul className="card divide-y divide-line overflow-hidden">{current.map(row)}</ul>
      {past.length > 0 && <ul className="card divide-y divide-line overflow-hidden opacity-80">{past.map(row)}</ul>}
    </div>
  );
}

function Sources({ d }: { d: MepDossier }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <SectionTitle>{t("dossier.declarations")}</SectionTitle>
        <p className="max-w-[60ch] text-[13.5px] text-muted">{t("dossier.declarationsText")}</p>
        <a
          href={d.links.declarations}
          target="_blank"
          rel="noreferrer"
          className="press card flex items-center gap-3 self-start p-3.5 text-[14px] font-semibold hover:text-stamp"
        >
          <FilePdf size={18} className="shrink-0 text-muted" aria-hidden />
          {t("dossier.declarations")}
          <ArrowUpRight size={13} weight="bold" aria-hidden />
        </a>
      </div>
      <a
        href={d.links.ep}
        target="_blank"
        rel="noreferrer"
        className="press card inline-flex items-center gap-2 self-start px-3.5 py-2.5 text-[13.5px] font-semibold hover:text-stamp"
      >
        {t("dossier.official")}
        <ArrowUpRight size={14} weight="bold" aria-hidden />
      </a>
      <div className="flex flex-wrap gap-1.5">
        {d.sources.map((s) => (
          <SourceStamp key={s.key + s.url} href={s.url}>
            {s.key}
          </SourceStamp>
        ))}
      </div>
    </div>
  );
}

const ROLES: Record<string, [string, string, string]> = {
  CHAIR: ["voorzitter", "président", "chair"],
  CHAIR_VICE: ["ondervoorzitter", "vice-président", "vice-chair"],
  MEMBER_SUBSTITUTE: ["plaatsvervanger", "suppléant", "substitute"],
  MEMBER_BUREAU: ["lid van het bureau", "membre du bureau", "bureau member"],
  PRESIDENT: ["voorzitter", "président", "president"],
  PRESIDENT_VICE: ["ondervoorzitter", "vice-président", "vice-president"],
  QUAESTOR: ["quaestor", "questeur", "quaestor"],
  CO_CHAIR: ["covoorzitter", "coprésident", "co-chair"],
  CO_CHAIR_VICE: ["vicecovoorzitter", "vice-coprésident", "vice co-chair"],
  TREASURER: ["penningmeester", "trésorier", "treasurer"],
};
function roleLabel(code: string, lang: "nl" | "fr" | "en") {
  const r = ROLES[code];
  if (r) return r[lang === "nl" ? 0 : lang === "fr" ? 1 : 2];
  return code.toLowerCase().replace(/_/g, " ");
}
