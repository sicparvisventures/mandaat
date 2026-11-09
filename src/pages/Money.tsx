import { ArrowLeft, ArrowUpRight, Handshake, Info, Warning } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader, PageSkeleton, SectionTitle, SourceStamp, Stat } from "../components/ui";
import { NotFoundError, qMoney } from "../lib/data";
import { type Key, useI18n } from "../lib/i18n";
import type { MoneyOverview, RecipientDossier, TedAward } from "../lib/types";

/** NUTS2 regions of Belgium */
const PROVINCES: Record<string, [string, string, string]> = {
  BE10: ["Brussels Hoofdstedelijk Gewest", "Région de Bruxelles-Capitale", "Brussels-Capital Region"],
  BE21: ["Antwerpen", "Anvers", "Antwerp"],
  BE22: ["Limburg", "Limbourg", "Limburg"],
  BE23: ["Oost-Vlaanderen", "Flandre-Orientale", "East Flanders"],
  BE24: ["Vlaams-Brabant", "Brabant flamand", "Flemish Brabant"],
  BE25: ["West-Vlaanderen", "Flandre-Occidentale", "West Flanders"],
  BE31: ["Waals-Brabant", "Brabant wallon", "Walloon Brabant"],
  BE32: ["Henegouwen", "Hainaut", "Hainaut"],
  BE33: ["Luik", "Liège", "Liège"],
  BE34: ["Luxemburg", "Luxembourg", "Luxembourg"],
  BE35: ["Namen", "Namur", "Namur"],
};

export function useEur() {
  const { locale } = useI18n();
  const compact = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const full = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  return { compact: (n: number) => compact.format(n), full: (n: number) => full.format(n) };
}

function Bars({ items }: { items: { key: string; label: React.ReactNode; value: number; display: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1">
          <span className="min-w-0 truncate text-[14px]">{i.label}</span>
          <span className="tnum font-mono text-[12px] text-muted">{i.display}</span>
          <span
            aria-hidden
            className="col-span-2 h-[5px] rounded-full bg-stamp"
            style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }}
          />
        </li>
      ))}
    </ol>
  );
}

export function Money() {
  const data = useQuery(qMoney.money());
  if (data.isPending) return <PageSkeleton />;
  if (data.isError) return <ErrorState onRetry={() => data.refetch()} />;
  return <MoneyView m={data.data} />;
}

function MoneyView({ m }: { m: MoneyOverview }) {
  const { t, lang, num, date } = useI18n();
  const eur = useEur();
  const [limit, setLimit] = useState(25);
  const latest = m.fts.years[m.fts.years.length - 1];
  const koh = m.kohesio.periods.find((p) => p.period === "2021-2027");
  const li = lang === "nl" ? 0 : lang === "fr" ? 1 : 2;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={t("money.title")} lede={t("money.lede")} />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {latest && <Stat value={eur.compact(latest.amount)} label={t("money.ftsYear", { year: latest.year })} />}
        {koh && <Stat value={eur.compact(koh.eu)} label={t("money.kohesioPeriod")} />}
        <Stat value={num(m.ted.count)} label={t("money.tedCount")} />
        <Stat
          value={eur.compact(m.fts.years.reduce((n, y) => n + y.amount, 0))}
          label={t("money.ftsTotal", { from: m.fts.years[0]?.year ?? "", to: latest?.year ?? "" })}
        />
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>{t("money.topRecipients")}</SectionTitle>
        <p className="max-w-[62ch] text-[13.5px] text-muted">{t("money.topRecipientsText")}</p>
        <ol className="card divide-y divide-line overflow-hidden">
          {m.topRecipients.slice(0, limit).map((r, i) => (
            <li key={r.id}>
              <Link
                to="/geld/$id"
                params={{ id: r.id }}
                className="grid grid-cols-[28px_1fr_auto] items-center gap-x-3 p-3.5 hover:bg-sunken"
              >
                <span className="tnum font-mono text-[12px] text-faint">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold">{r.name}</span>
                    {r.lobbyId && (
                      <Handshake size={14} className="shrink-0 text-stamp" aria-label={t("money.alsoLobbies")} />
                    )}
                  </span>
                  {(r.city || r.kbo) && (
                    <span className="block truncate text-[12px] text-muted">
                      {[r.city, r.kbo ? `KBO ${r.kbo}` : null].filter(Boolean).join(", ")}
                    </span>
                  )}
                </span>
                <span className="tnum text-right font-mono text-[13px] font-semibold">{eur.compact(r.eu)}</span>
              </Link>
            </li>
          ))}
        </ol>
        {m.topRecipients.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            className="press self-start rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
          >
            {t("dossier.showMore")}
          </button>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card flex min-w-0 flex-col gap-4 p-4">
          <SectionTitle>{t("money.byDept")}</SectionTitle>
          <Bars
            items={m.fts.byDept.slice(0, 10).map((d) => ({
              key: d.name,
              label: d.name,
              value: d.amount,
              display: eur.compact(d.amount),
            }))}
          />
          <div className="flex flex-wrap gap-2">
            {m.fts.years.map((y) => (
              <span key={y.year} className="rounded-md bg-sunken px-2 py-1 font-mono text-[11.5px] text-muted">
                {y.year}: {eur.compact(y.amount)}
              </span>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">
            {t("money.excluded", { amount: eur.compact(m.fts.years.reduce((n, y) => n + y.excluded, 0)) })}
          </p>
          <SourceStamp href="https://ec.europa.eu/budget/financial-transparency-system">
            EU Financial Transparency System
          </SourceStamp>
        </section>

        <section className="card flex min-w-0 flex-col gap-4 p-4">
          <SectionTitle>{t("money.byProvince")}</SectionTitle>
          <Bars
            items={m.kohesio.byProvince.map((p) => ({
              key: p.code,
              label: PROVINCES[p.code]?.[li] ?? p.code,
              value: p.amount,
              display: eur.compact(p.amount),
            }))}
          />
          <div className="flex flex-wrap gap-2">
            {m.kohesio.byFund.map((f) => (
              <span key={f.name} className="rounded-md bg-sunken px-2 py-1 text-[11.5px] text-muted">
                {f.name}: {eur.compact(f.amount)}
              </span>
            ))}
          </div>
          <SourceStamp href="https://kohesio.ec.europa.eu">kohesio.ec.europa.eu, 2014-2027</SourceStamp>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>{t("money.tedTitle")}</SectionTitle>
        <div className="flex gap-3 rounded-2xl bg-sunken p-4">
          <Warning size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <p className="max-w-[70ch] text-[13px] text-muted">{t("money.tedCaveat", { from: date(m.ted.from) })}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card flex min-w-0 flex-col gap-4 p-4">
            <h3 className="display-md text-[16px]">{t("money.topBuyers")}</h3>
            <Bars
              items={m.ted.byBuyer.slice(0, 12).map((b) => ({
                key: b.id,
                label: (
                  <Link to="/geld/$id" params={{ id: b.id }} className="font-medium hover:text-stamp">
                    {b.name}
                  </Link>
                ),
                value: b.count,
                display: `${b.count}`,
              }))}
            />
          </div>
          <div className="card flex min-w-0 flex-col gap-4 p-4">
            <h3 className="display-md text-[16px]">{t("money.topWinners")}</h3>
            <Bars
              items={m.ted.byWinner.slice(0, 12).map((b) => ({
                key: b.id,
                label: (
                  <Link to="/geld/$id" params={{ id: b.id }} className="font-medium hover:text-stamp">
                    {b.name}
                  </Link>
                ),
                value: b.count,
                display: `${b.count}`,
              }))}
            />
          </div>
        </div>
        <SourceStamp href="https://ted.europa.eu">ted.europa.eu</SourceStamp>
      </section>
    </div>
  );
}

export function RecipientRoute() {
  const { id } = useParams({ strict: false }) as { id: string };
  return <Recipient key={id} id={id} />;
}

function Recipient({ id }: { id: string }) {
  const { t } = useI18n();
  const r = useQuery(qMoney.recipient(id));
  if (r.isPending) return <PageSkeleton />;
  if (r.isError) {
    if (r.error instanceof NotFoundError) return <EmptyState icon={<Info size={22} />} text={t("dossier.notFound")} />;
    return <ErrorState onRetry={() => r.refetch()} />;
  }
  return <RecipientView r={r.data} />;
}

function AwardList({ items, mode }: { items: TedAward[]; mode: "won" | "awarded" }) {
  const { date } = useI18n();
  const eur = useEur();
  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {items.map((a) => (
        <li
          key={`${mode}-${a.id}`}
          className="grid gap-1 p-3.5 sm:grid-cols-[96px_1fr_auto] sm:items-baseline sm:gap-4"
        >
          <time dateTime={a.date} className="tnum font-mono text-[12px] text-muted">
            {date(a.date)}
          </time>
          <p className="min-w-0 text-[14px] leading-snug">
            {mode === "won" ? (
              <Link to="/geld/$id" params={{ id: a.buyerId }} className="font-semibold hover:text-stamp">
                {a.buyer}
              </Link>
            ) : (
              a.winners.map((w, i) => (
                <span key={w.id}>
                  {i > 0 && ", "}
                  <Link to="/geld/$id" params={{ id: w.id }} className="font-semibold hover:text-stamp">
                    {w.name}
                  </Link>
                </span>
              ))
            )}
            <a
              href={`https://ted.europa.eu/en/notice/-/detail/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex items-center gap-0.5 font-mono text-[11px] text-muted hover:text-stamp"
            >
              {a.id}
              <ArrowUpRight size={10} weight="bold" aria-hidden />
            </a>
          </p>
          <span className="tnum font-mono text-[12.5px]">{a.value != null ? eur.compact(a.value) : "-"}</span>
        </li>
      ))}
    </ol>
  );
}

function RecipientView({ r }: { r: RecipientDossier }) {
  const { t } = useI18n();
  const eur = useEur();
  const tabs: [string, Key, number][] = [
    ["flows", "money.tabFlows", r.flows],
    ["won", "money.tabWon", r.won],
    ["awarded", "money.tabAwarded", r.awarded],
  ];
  const visible = tabs.filter(([, , n]) => n > 0);
  const [tab, setTab] = useState(visible[0]?.[0] ?? "flows");
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/geld"
        className="press -ml-2 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        {t("money.title")}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className={`display ${r.name.length > 48 ? "text-[26px] sm:text-[36px]" : "text-[34px] sm:text-[46px]"}`}>
          {r.name}
        </h1>
        <p className="text-[14px] text-muted">{[r.city, r.kbo ? `KBO ${r.kbo}` : null].filter(Boolean).join(", ")}</p>
        {r.lobbyId && (
          <Link
            to="/lobby/$id"
            params={{ id: r.lobbyId }}
            className="press mt-1 inline-flex items-center gap-2 self-start rounded-xl bg-stamp-soft px-3 py-2 text-[13px] font-semibold text-stamp"
          >
            <Handshake size={16} weight="fill" aria-hidden />
            {t("money.alsoLobbies")}
          </Link>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {r.eu > 0 && <Stat value={eur.compact(r.eu)} label={t("money.euReceived")} />}
        {r.flows > 0 && <Stat value={r.flows} label={t("money.commitments")} />}
        {r.won > 0 && <Stat value={r.won} label={t("money.contractsWon")} />}
        {r.awarded > 0 && <Stat value={r.awarded} label={t("money.contractsAwarded")} />}
      </div>

      {r.byProgramme.length > 0 && (
        <section className="card flex flex-col gap-4 p-4">
          <SectionTitle>{t("money.byProgramme")}</SectionTitle>
          <Bars
            items={r.byProgramme.map((p) => ({
              key: p.name,
              label: p.name,
              value: p.amount,
              display: eur.compact(p.amount),
            }))}
          />
          <div className="flex flex-wrap gap-2">
            {r.byYear.map((y) => (
              <span key={y.year} className="rounded-md bg-sunken px-2 py-1 font-mono text-[11.5px] text-muted">
                {y.year}: {eur.compact(y.amount)}
              </span>
            ))}
          </div>
        </section>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col gap-4">
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
            {visible.map(([v, k, n]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                onClick={() => setTab(v)}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-[color,border-color] duration-150 ${tab === v ? "border-stamp text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {t(k)}
                <span className="tnum ml-1.5 font-mono text-[11px] text-faint">{n}</span>
              </button>
            ))}
          </div>
          {tab === "flows" && (
            <ol className="card divide-y divide-line overflow-hidden">
              {r.topFlows.map((f, i) => (
                <li
                  key={`${f.source}-${i}`}
                  className="grid gap-1 p-3.5 sm:grid-cols-[64px_1fr_auto] sm:items-baseline sm:gap-4"
                >
                  <span className="tnum font-mono text-[12px] text-muted">{f.year}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] leading-snug">
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-stamp">
                          {f.subject ?? f.programme}
                        </a>
                      ) : (
                        (f.subject ?? f.programme)
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-faint">
                      {[f.source === "fts" ? "FTS" : "Kohesio", f.programme, f.dept].filter(Boolean).join("  /  ")}
                    </p>
                  </div>
                  <span className="tnum font-mono text-[12.5px] font-semibold">{eur.full(f.amount)}</span>
                </li>
              ))}
            </ol>
          )}
          {tab === "won" && <AwardList items={r.contractsWon} mode="won" />}
          {tab === "awarded" && (
            <>
              <div className="flex gap-3 rounded-2xl bg-sunken p-4">
                <Warning size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                <p className="max-w-[70ch] text-[13px] text-muted">{t("money.tedCaveatShort")}</p>
              </div>
              <AwardList items={r.contractsAwarded} mode="awarded" />
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {r.sources.map((s) => (
          <SourceStamp key={s.key} href={s.url}>
            {s.key}
          </SourceStamp>
        ))}
      </div>
    </div>
  );
}
