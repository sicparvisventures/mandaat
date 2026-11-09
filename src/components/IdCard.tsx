import { useI18n } from "../lib/i18n";
import type { MepSummary } from "../lib/types";
import { countryName, Portrait } from "./ui";

const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<");

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + "<".repeat(n - s.length));

/** Machine-readable zone in the style of an ICAO travel document, but for an elected mandate. */
export function mrzLines(m: Pick<MepSummary, "name" | "sort" | "country" | "id">, since: string | null) {
  const year = since?.slice(0, 4) ?? "0000";
  const given = m.name.replace(new RegExp(m.sort, "i"), "").trim() || m.name;
  const l1 = pad(`IM${m.country}<EP<${year}<${m.id}`, 36);
  const l2 = pad(`${ascii(m.sort)}<<${ascii(given)}<<WORKS<FOR<US`, 36);
  return [l1, l2];
}

export function IdCard({
  mep,
  since,
  salary,
  compact = false,
}: {
  mep: MepSummary;
  since: string | null;
  salary?: string;
  compact?: boolean;
}) {
  const { t, date, locale } = useI18n();
  const [l1, l2] = mrzLines(mep, since);
  return (
    <article
      aria-label={`${t("card.kind")}: ${mep.name}`}
      className="guilloche overflow-hidden rounded-[20px] shadow-[0_0_0_1px_color-mix(in_oklab,var(--guil)_55%,transparent),0_10px_30px_-14px_hsl(var(--shadow)/0.35)]"
    >
      <div className={compact ? "p-3.5" : "p-4 sm:p-5"}>
        <div className="flex items-start justify-between gap-3">
          <p className="label leading-relaxed">
            {t("card.kind")}
            <br />
            <span className="text-ink">
              {t("card.institution")}, {countryName(mep.country, locale)}
            </span>
          </p>
          <span className="grid h-7 w-10 shrink-0 place-items-center rounded-[6px] bg-stamp font-mono text-[11px] font-bold text-stamp-ink">
            {mep.country}
          </span>
        </div>
        <div
          className={`mt-3.5 grid gap-4 ${compact ? "grid-cols-[64px_1fr]" : "grid-cols-[88px_1fr] sm:grid-cols-[104px_1fr]"}`}
        >
          <Portrait id={mep.id} name={mep.name} className="aspect-[4/5] w-full rounded-[10px]" />
          <dl className="grid min-w-0 grid-cols-2 content-start gap-x-3 gap-y-2.5">
            <div className="col-span-2 min-w-0">
              <dt className="label text-[9.5px]">{t("card.name")}</dt>
              <dd className={`display-md truncate ${compact ? "text-[19px]" : "text-[24px]"}`}>{mep.name}</dd>
            </div>
            <Field label={t("card.group")} value={mep.groupLabel ?? mep.group ?? "-"} />
            <Field label={t("card.party")} value={mep.party ?? "-"} />
            {!compact && <Field label={t("card.since")} value={since ? date(since) : "-"} />}
            {!compact && <Field label={t("card.employer")} value={t("card.employerValue")} />}
            {!compact && salary && <Field label={t("card.salary")} value={salary} />}
          </dl>
        </div>
      </div>
      <div
        aria-hidden
        className={`mrz bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] text-ink ${compact ? "px-3.5 py-2 text-[9px]" : "px-4 py-2.5 text-[11px] sm:px-5"}`}
      >
        <div>{l1}</div>
        <div>{l2}</div>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label text-[9.5px]">{label}</dt>
      <dd className="text-[13px] font-semibold leading-snug [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
