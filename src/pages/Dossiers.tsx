import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { countryName, ErrorState, PageHeader, PageSkeleton, Portrait } from "../components/ui";
import { useMeps } from "../lib/data";
import { useI18n } from "../lib/i18n";

function readPref(key: string, fallback: string) {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: string) {
  try {
    sessionStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

export function Dossiers() {
  const { t, locale } = useI18n();
  const meps = useMeps();
  const [country, setCountry] = useState(() => readPref("mandaat.f.country", "BE"));
  const [group, setGroup] = useState(() => readPref("mandaat.f.group", ""));
  const [sort, setSort] = useState<"name" | "meetings">(() =>
    readPref("mandaat.f.sort", "name") === "meetings" ? "meetings" : "name",
  );

  const countries = useMemo(() => {
    const s = new Set((meps.data ?? []).map((m) => m.country));
    return [...s].sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale));
  }, [meps.data, locale]);
  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of meps.data ?? []) if (m.group) map.set(m.group, m.groupLabel ?? m.group);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [meps.data]);

  const list = useMemo(() => {
    const l = (meps.data ?? []).filter((m) => (!country || m.country === country) && (!group || m.group === group));
    return l.sort((a, b) =>
      sort === "meetings"
        ? b.meetings12m - a.meetings12m || a.sort.localeCompare(b.sort)
        : a.sort.localeCompare(b.sort),
    );
  }, [meps.data, country, group, sort]);

  if (meps.isPending) return <PageSkeleton />;
  if (meps.isError) return <ErrorState onRetry={() => meps.refetch()} />;

  const selectCls =
    "card w-full appearance-none rounded-xl bg-surface px-3 py-2.5 pr-8 text-[14px] font-medium bg-[length:12px] bg-[right_12px_center] bg-no-repeat";
  const caret = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpath fill='%23888' d='M213.7 101.7l-80 80a8 8 0 0 1-11.4 0l-80-80a8 8 0 0 1 11.4-11.4L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4Z'/%3E%3C/svg%3E\")",
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("dossiers.title")} lede={t("dossiers.lede", { n: meps.data.length })} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-country" className="label">
            {t("dossiers.country")}
          </label>
          <select
            id="f-country"
            value={country}
            style={caret}
            className={selectCls}
            onChange={(e) => {
              setCountry(e.target.value);
              writePref("mandaat.f.country", e.target.value);
            }}
          >
            <option value="">{t("dossiers.allCountries")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-group" className="label">
            {t("dossiers.group")}
          </label>
          <select
            id="f-group"
            value={group}
            style={caret}
            className={selectCls}
            onChange={(e) => {
              setGroup(e.target.value);
              writePref("mandaat.f.group", e.target.value);
            }}
          >
            <option value="">{t("dossiers.allGroups")}</option>
            {groups.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <label htmlFor="f-sort" className="label">
            {t("dossiers.sort")}
          </label>
          <select
            id="f-sort"
            value={sort}
            style={caret}
            className={selectCls}
            onChange={(e) => {
              const v = e.target.value === "meetings" ? "meetings" : "name";
              setSort(v);
              writePref("mandaat.f.sort", v);
            }}
          >
            <option value="name">{t("dossiers.sortName")}</option>
            <option value="meetings">{t("dossiers.sortMeetings")}</option>
          </select>
        </div>
      </div>
      <p className="font-mono text-[12px] text-muted" aria-live="polite">
        {t("dossiers.count", { n: list.length })}
      </p>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <li key={m.id}>
            <Link
              to="/dossier/$id"
              params={{ id: m.id }}
              className="press card flex items-center gap-3 p-3 hover:shadow-[0_0_0_1px_var(--stamp)]"
            >
              <Portrait id={m.id} name={m.name} className="h-[60px] w-12 shrink-0 rounded-[8px]" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14.5px] font-semibold">{m.name}</span>
                <span className="truncate text-[12.5px] text-muted">
                  {[m.groupLabel ?? m.group, m.party].filter(Boolean).join(", ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="display tnum text-[22px] leading-none">{m.meetings12m}</span>
                <span className="text-[10.5px] text-faint">{t("lobby.meetings")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
