import { Handshake } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ErrorState, PageSkeleton, Portrait, RankList, SectionTitle, SourceStamp, TextLink } from "../components/ui";
import { q, useMeps, useMeta } from "../lib/data";
import { useI18n } from "../lib/i18n";
import type { FeedItem } from "../lib/types";

export function Home() {
  const { t, date } = useI18n();
  const meps = useMeps();
  const meta = useMeta();
  const feed = useQuery(q.feed());
  const [scope, setScope] = useState<"BE" | "ALL">("BE");

  const be = useMemo(
    () => (meps.data ?? []).filter((m) => m.country === "BE").sort((a, b) => a.sort.localeCompare(b.sort)),
    [meps.data],
  );
  const lobbied = useMemo(() => [...be].sort((a, b) => b.meetings12m - a.meetings12m).slice(0, 8), [be]);
  const items = useMemo(
    () => (feed.data ?? []).filter((f) => scope === "ALL" || f.country === "BE").slice(0, 14),
    [feed.data, scope],
  );

  if (meps.isPending) return <PageSkeleton />;
  if (meps.isError) return <ErrorState onRetry={() => meps.refetch()} />;

  return (
    <div className="flex flex-col gap-10">
      <header className="enter flex flex-col gap-3 pt-1">
        <h1 className="display text-[44px] sm:text-[64px]">{t("home.title")}</h1>
        <p className="max-w-[54ch] text-[16px] text-muted">{t("home.lede")}</p>
        {meta.data && (
          <p className="font-mono text-[11.5px] text-faint">
            {t("home.dataFrom", { date: date(meta.data.generatedAt) })}
          </p>
        )}
      </header>

      <section className="enter flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
        <SectionTitle action={<TextLink to="/dossiers">{t("home.all")}</TextLink>}>
          {t("home.yourMeps", { n: be.length })}
        </SectionTitle>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-11 lg:overflow-visible lg:px-0">
          {be.map((m) => (
            <li key={m.id} className="snap-start">
              <Link
                to="/dossier/$id"
                params={{ id: m.id }}
                className="press group flex w-[68px] flex-col items-center gap-1.5 text-center lg:w-auto"
              >
                <Portrait
                  id={m.id}
                  name={m.name}
                  className="size-[60px] rounded-full ring-2 ring-surface transition-[box-shadow] duration-150 group-hover:ring-stamp"
                />
                <span className="line-clamp-2 text-[11.5px] leading-tight text-muted group-hover:text-ink">
                  {m.sort}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
        <section className="flex min-w-0 flex-col gap-4">
          <SectionTitle
            action={
              <fieldset className="flex gap-1 rounded-lg bg-sunken p-0.5">
                {(["BE", "ALL"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={scope === s}
                    onClick={() => setScope(s)}
                    className={`press rounded-md px-2.5 py-1 text-[12px] font-semibold ${scope === s ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted"}`}
                  >
                    {s === "BE" ? "België" : "EU"}
                  </button>
                ))}
              </fieldset>
            }
          >
            {t("home.latest")}
          </SectionTitle>
          {feed.isPending ? (
            <PageSkeleton />
          ) : feed.isError ? (
            <ErrorState onRetry={() => feed.refetch()} />
          ) : (
            <ol className="flex flex-col gap-2.5">
              {items.map((f, i) => (
                <FeedRow key={`${f.mepId}-${f.date}-${i}`} item={f} />
              ))}
            </ol>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <SectionTitle>{t("home.mostLobbied")}</SectionTitle>
          <div className="card p-4">
            <RankList
              items={lobbied.map((m) => ({
                key: m.id,
                label: m.name,
                value: m.meetings12m,
                to: (
                  <Link to="/dossier/$id" params={{ id: m.id }} className="font-medium hover:text-stamp">
                    {m.name}
                  </Link>
                ),
              }))}
            />
            <div className="mt-4">
              <SourceStamp href="https://www.integritywatch.eu/mepmeetings">integritywatch.eu, EP-meetings</SourceStamp>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const { t, date } = useI18n();
  const org = item.orgs[0];
  return (
    <li className="card flex gap-3 p-3.5">
      <Link to="/dossier/$id" params={{ id: item.mepId }} className="shrink-0">
        <Portrait id={item.mepId} name={item.mepName} className="size-10 rounded-full" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <Handshake size={13} aria-hidden />
          <span>
            {t("feed.meeting")} · <time dateTime={item.date}>{date(item.date)}</time>
          </span>
        </p>
        <p className="text-[14px] leading-snug">
          <Link to="/dossier/$id" params={{ id: item.mepId }} className="font-semibold hover:text-stamp">
            {item.mepName}
          </Link>{" "}
          {t("feed.met")}{" "}
          {org ? (
            <Link to="/lobby/$id" params={{ id: org.id }} className="font-semibold hover:text-stamp">
              {org.name}
            </Link>
          ) : (
            "?"
          )}
          {item.orgs.length > 1 && <span className="text-muted"> +{item.orgs.length - 1}</span>}
          {item.title && (
            <>
              {" "}
              {t("feed.about")} <span className="text-muted">{item.title}</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}
