import { ArrowLeft, ArrowUpRight, Info, Star } from "@phosphor-icons/react";
import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { IdCard } from "../components/IdCard";
import { EmptyState, ErrorState, PageSkeleton, SectionTitle, SourceStamp, Stat } from "../components/ui";
import { NotFoundError, qVp } from "../lib/data";
import { type Key, useI18n } from "../lib/i18n";
import type { VoteRecord, VpDossier } from "../lib/types";
import { useWatchlist } from "../lib/watchlist";

/** Gross yearly pay of a Flemish MP as listed by the Rekenhof for 2024 (Anaf Hannes, Mandatenlijst 2024). */
export const VP_PAY_2024_GROSS_EUR = 80881.14;

export function VpDossierPage({ id }: { id: string }) {
  const { t } = useI18n();
  const d = useQuery(qVp.dossier(id));
  if (d.isPending) return <PageSkeleton />;
  if (d.isError) {
    if (d.error instanceof NotFoundError) return <EmptyState icon={<Info size={22} />} text={t("dossier.notFound")} />;
    return <ErrorState onRetry={() => d.refetch()} />;
  }
  return <View d={d.data} />;
}

const POS: Record<VoteRecord["position"], { k: Key; cls: string }> = {
  FOR: { k: "dossier.for", cls: "text-good bg-good/12" },
  AGAINST: { k: "dossier.against", cls: "text-bad bg-bad/12" },
  ABSTENTION: { k: "dossier.abstention", cls: "text-warn bg-warn/12" },
  DID_NOT_VOTE: { k: "dossier.didNotVote", cls: "text-muted bg-sunken" },
};

function View({ d }: { d: VpDossier }) {
  const { t, date, locale } = useI18n();
  const watch = useWatchlist();
  const following = watch.has(d.id);
  const [limit, setLimit] = useState(25);
  const pay = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    VP_PAY_2024_GROSS_EUR,
  );
  const current = d.mandates.filter((m) => !m.end);
  const past = d.mandates.filter((m) => m.end);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dossiers"
          search={{ inst: "vp" }}
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
            person={{ id: d.id, name: d.name, sort: d.sort, country: "BE" }}
            institution={t("inst.vp")}
            code="VP"
            since={d.since}
            photo={null}
            fields={[
              [t("vp.fractie"), d.party],
              [t("vp.district"), d.district],
              [t("vp.since"), d.since ? date(d.since) : "-"],
              [t("card.employer"), t("card.employerValue")],
              [t("vp.payLabel"), pay],
            ]}
          />
          <p className="text-[12px] text-faint">{t("vp.noPhoto")}</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat
              value={d.voteAttendance == null ? "-" : `${Math.round(d.voteAttendance * 100)}%`}
              label={t("vp.voteAttendance")}
            />
            <Stat value={d.questions ?? "-"} label={t("vp.questions")} />
            <Stat value={d.otherMandates} label={t("vp.otherMandates")} />
          </div>
        </div>

        <aside className="enter flex min-w-0 flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="card flex flex-col gap-3 p-4">
            <SectionTitle>{t("vp.committees")}</SectionTitle>
            <ul className="flex flex-col gap-2">
              {d.committees.map((c) => (
                <li key={`${c.code}-${c.role}`} className="text-[14px]">
                  <span className="font-semibold">{c.title.replace(/^Commissie voor /, "")}</span>
                  {c.role && <span className="text-muted">, {c.role}</span>}
                </li>
              ))}
            </ul>
            {d.plenaryPresent != null && (
              <p className="font-mono text-[12px] text-muted">
                {d.plenaryPresent} {t("vp.plenary")}
                {d.plenaryExcused ? `, ${d.plenaryExcused} ${t("vp.excused")}` : ""}
              </p>
            )}
          </div>
          <div className="flex gap-3 rounded-2xl bg-sunken p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-semibold">{t("dossier.howToRead")}</p>
              <p className="text-[13px] text-muted">{t("vp.howToRead")}</p>
            </div>
          </div>
        </aside>
      </div>

      <Tabs.Root defaultValue="votes" className="flex flex-col gap-4">
        <Tabs.List className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {(
            [
              ["votes", "dossier.tabVotes", d.votes?.total ?? null],
              ["mandates", "vp.mandates", d.mandates.length],
              ["career", "vp.career", d.career.length],
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

        <Tabs.Content value="votes">
          {!d.votes ? (
            <EmptyState icon={<Info size={22} />} text={t("vp.noVotes")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat value={d.votes.for} label={t("dossier.for")} />
                <Stat value={d.votes.against} label={t("dossier.against")} />
                <Stat value={d.votes.abstention} label={t("dossier.abstention")} />
                <Stat value={d.votes.total - d.votes.present} label={t("dossier.didNotVote")} />
              </div>
              <ol className="card divide-y divide-line overflow-hidden">
                {d.votes.recent.slice(0, limit).map((r) => {
                  const p = POS[r.position];
                  return (
                    <li
                      key={r.id}
                      className="grid gap-1.5 p-3.5 sm:grid-cols-[96px_1fr_auto] sm:items-baseline sm:gap-4"
                    >
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
              {d.votes.recent.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + 50)}
                  className="press self-start rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
                >
                  {t("dossier.showMore")}
                </button>
              )}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="mandates" className="flex flex-col gap-3">
          <p className="max-w-[62ch] text-[13.5px] text-muted">{t("vp.mandatesText")}</p>
          {[current, past].map(
            (list, i) =>
              list.length > 0 && (
                <ul
                  key={i === 0 ? "cur" : "past"}
                  className={`card divide-y divide-line overflow-hidden ${i ? "opacity-80" : ""}`}
                >
                  {list.map((m, j) => (
                    <li key={`${m.title}-${j}`} className="grid gap-0.5 p-3.5 sm:grid-cols-[1fr_auto] sm:gap-4">
                      <span className="min-w-0 text-[14px]">
                        <span className="font-semibold">{m.title}</span>
                        {m.group && <span className="text-muted">, {m.group.toLowerCase()}</span>}
                      </span>
                      <span className="tnum font-mono text-[11.5px] text-muted">
                        {m.start ? date(m.start) : ""}
                        {m.end ? ` - ${date(m.end)}` : ` - ${t("dossier.current")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ),
          )}
          <SourceStamp href="https://www.ccrek.be/nl/publicatie/mandatenlijsten">Rekenhof, mandatenlijsten</SourceStamp>
        </Tabs.Content>

        <Tabs.Content value="career">
          <ul className="card divide-y divide-line overflow-hidden">
            {d.career.map((c, i) => (
              <li key={`${c.title}-${i}`} className="grid gap-0.5 p-3.5 sm:grid-cols-[1fr_auto] sm:gap-4">
                <span className="min-w-0 text-[14px]">
                  <span className="font-semibold">{c.title}</span>
                  {c.employer && <span className="text-muted">, {c.employer}</span>}
                </span>
                <span className="tnum font-mono text-[11.5px] text-muted">
                  {c.start?.slice(0, 7) ?? ""}
                  {c.end ? ` - ${c.end.slice(0, 7)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Tabs.Content>
      </Tabs.Root>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={d.links.vp}
          target="_blank"
          rel="noreferrer"
          className="press card inline-flex items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-semibold hover:text-stamp"
        >
          {t("vp.official")}
          <ArrowUpRight size={14} weight="bold" aria-hidden />
        </a>
        {d.sources.map((s) => (
          <SourceStamp key={s.key} href={s.url}>
            {s.key}
          </SourceStamp>
        ))}
      </div>
    </div>
  );
}
