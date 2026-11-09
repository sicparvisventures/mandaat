import { ArrowLeft, ArrowUpRight, Info } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  countryName,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Portrait,
  RankList,
  SectionTitle,
  SourceStamp,
  Stat,
} from "../components/ui";
import { NotFoundError, q } from "../lib/data";
import { useI18n } from "../lib/i18n";
import type { OrgDossier } from "../lib/types";

export function Lobby() {
  const { t } = useI18n();
  const orgs = useQuery(q.orgs());
  const [beOnly, setBeOnly] = useState(true);
  const [limit, setLimit] = useState(60);
  const list = useMemo(() => {
    const l = (orgs.data ?? []).filter((o) => !beOnly || o.beMeetings > 0);
    return [...l].sort(
      (a, b) => (beOnly ? b.beMeetings - a.beMeetings : b.meetings12m - a.meetings12m) || b.meetings - a.meetings,
    );
  }, [orgs.data, beOnly]);

  if (orgs.isPending) return <PageSkeleton />;
  if (orgs.isError) return <ErrorState onRetry={() => orgs.refetch()} />;
  const max = Math.max(1, ...list.slice(0, limit).map((o) => (beOnly ? o.beMeetings : o.meetings12m)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("lobby.title")} lede={t("lobby.lede")} />
      <label className="flex cursor-pointer items-center gap-3 self-start text-[14px] font-medium">
        <span className="relative inline-flex">
          <input
            id="be-only"
            type="checkbox"
            checked={beOnly}
            onChange={(e) => setBeOnly(e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-6 w-10 rounded-full bg-line transition-[background-color] duration-150 peer-checked:bg-stamp peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-stamp" />
          <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow transition-[translate] duration-150 ease-[cubic-bezier(0.2,0,0,1)] peer-checked:translate-x-4" />
        </span>
        {t("lobby.filterBe")}
      </label>
      <ol className="card divide-y divide-line overflow-hidden">
        {list.slice(0, limit).map((o, i) => {
          const value = beOnly ? o.beMeetings : o.meetings12m;
          return (
            <li key={o.id}>
              <Link
                to="/lobby/$id"
                params={{ id: o.id }}
                className="grid grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-1.5 p-3.5 hover:bg-sunken"
              >
                <span className="tnum font-mono text-[12px] text-faint">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{o.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {o.meps} MEP's{o.category ? `, ${o.category}` : ""}
                  </span>
                </span>
                <span className="tnum text-right font-mono text-[13px] font-semibold">{value}</span>
                <span
                  aria-hidden
                  className="col-start-2 col-end-4 h-[4px] rounded-full bg-stamp"
                  style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
                />
              </Link>
            </li>
          );
        })}
      </ol>
      {list.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 100)}
          className="press self-start rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
        >
          {t("dossier.showMore")}
        </button>
      )}
    </div>
  );
}

export function OrgRoute() {
  const { id } = useParams({ strict: false }) as { id: string };
  return <Org key={id} id={id} />;
}

export function Org({ id }: { id: string }) {
  const { t } = useI18n();
  const org = useQuery(q.org(id));
  if (org.isPending) return <PageSkeleton />;
  if (org.isError) {
    if (org.error instanceof NotFoundError)
      return <EmptyState icon={<Info size={22} />} text={t("dossier.notFound")} />;
    return <ErrorState onRetry={() => org.refetch()} />;
  }
  return <OrgView o={org.data} />;
}

const eur = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

function OrgView({ o }: { o: OrgDossier }) {
  const { t, date, locale } = useI18n();
  const r = o.register;
  const cost =
    r?.costMin != null
      ? r.costMax != null && r.costMax !== r.costMin
        ? `${eur(r.costMin, locale)} - ${eur(r.costMax, locale)}`
        : eur(r.costMin, locale)
      : "-";
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/lobby"
        className="press -ml-2 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        {t("lobby.title")}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className={`display ${o.name.length > 48 ? "text-[26px] sm:text-[36px]" : "text-[34px] sm:text-[46px]"}`}>
          {o.name}
        </h1>
        <p className="text-[14px] text-muted">
          {[r?.category ?? o.category, r?.country ? countryName(r.country, locale) : null].filter(Boolean).join(", ")}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={o.meetings} label={t("lobby.meetings")} />
        <Stat
          value={cost}
          label={`${t(r?.costKind === "total" ? "lobby.totalBudget" : "lobby.budget")}${r?.costYear ? ` (${r.costYear})` : ""}`}
        />
        <Stat value={r?.persons ?? "-"} label={t("lobby.persons")} />
        <Stat value={r?.accreditations ?? "-"} label={t("lobby.accreditations")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
        <section className="card flex min-w-0 flex-col gap-4 self-start p-4">
          <SectionTitle>{t("lobby.metBy")}</SectionTitle>
          <RankList
            items={o.metMeps.slice(0, 15).map((m) => ({
              key: m.id,
              label: m.name,
              value: m.count,
              to: (
                <Link
                  to="/dossier/$id"
                  params={{ id: m.id }}
                  className="inline-flex items-center gap-2 font-medium hover:text-stamp"
                >
                  <Portrait id={m.id} name={m.name} className="size-6 rounded-full" />
                  <span className="truncate">{m.name}</span>
                  <span className="font-mono text-[11px] text-faint">{m.country}</span>
                </Link>
              ),
            }))}
          />
        </section>
        <section className="flex min-w-0 flex-col gap-3">
          <SectionTitle>{t("lobby.recent")}</SectionTitle>
          <ol className="card divide-y divide-line overflow-hidden">
            {o.recent.slice(0, 30).map((m, i) => (
              <li key={`${m.mepId}-${m.date}-${i}`} className="flex flex-col gap-1 p-3.5">
                <p className="text-[14px] leading-snug">
                  <Link to="/dossier/$id" params={{ id: m.mepId }} className="font-semibold hover:text-stamp">
                    {m.mepName}
                  </Link>
                  {m.title && <span className="text-muted">, {m.title}</span>}
                </p>
                <time dateTime={m.date} className="tnum font-mono text-[11.5px] text-faint">
                  {date(m.date)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {o.commission && (
        <section className="flex flex-col gap-3">
          <SectionTitle>{t("lobby.commission", { n: o.commission.count })}</SectionTitle>
          <ol className="card divide-y divide-line overflow-hidden">
            {o.commission.recent.map((m, i) => (
              <li key={`${m.date}-${i}`} className="grid gap-1 p-3.5 sm:grid-cols-[96px_1fr] sm:gap-4">
                <time dateTime={m.date} className="tnum font-mono text-[12px] text-muted">
                  {date(m.date)}
                </time>
                <p className="min-w-0 text-[14px] leading-snug">
                  <span className="font-semibold">{m.who}</span>
                  {m.subject && <span className="text-muted">, {m.subject}</span>}
                </p>
              </li>
            ))}
          </ol>
          <SourceStamp href="https://data.europa.eu/data/datasets/european-commission-meetings-with-interest-representatives">
            data.europa.eu, Commission meetings
          </SourceStamp>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>{t("lobby.register")}</SectionTitle>
        {r ? (
          <div className="card flex flex-col gap-3 p-4 text-[14px]">
            <p className="font-mono text-[12.5px]">ID {r.id}</p>
            {r.interests.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {r.interests.slice(0, 16).map((x) => (
                  <li key={x} className="rounded-md bg-sunken px-2 py-1 text-[12px] text-muted">
                    {x}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <SourceStamp href={r.url}>transparency-register.europa.eu</SourceStamp>
              {r.website && (
                <a
                  href={r.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-stamp hover:underline"
                >
                  Website <ArrowUpRight size={12} weight="bold" aria-hidden />
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-muted">{t("lobby.notInRegister")}</p>
        )}
      </section>
    </div>
  );
}
