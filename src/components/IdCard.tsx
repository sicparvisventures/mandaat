import { useI18n } from "../lib/i18n";
import { countryName, Portrait } from "./ui";

const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<");

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + "<".repeat(n - s.length));

type Person = { id: string; name: string; sort: string; country: string };

/** Machine-readable zone in the style of an ICAO travel document, but for an elected mandate. */
export function mrzLines(m: Person, since: string | null, code = "EP") {
  const year = since?.slice(0, 4) ?? "0000";
  const given = m.name.replace(new RegExp(m.sort, "i"), "").trim() || m.name;
  const l1 = pad(`IM${m.country}<${code}<${year}<${m.id.replace(/^vp-/, "")}`, 36);
  const l2 = pad(`${ascii(m.sort)}<<${ascii(given)}<<WORKS<FOR<US`, 36);
  return [l1, l2];
}

export function IdCard({
  person,
  institution,
  code = "EP",
  since,
  fields,
  photo,
}: {
  person: Person;
  institution: string;
  code?: string;
  since: string | null;
  fields: [string, string][];
  /** undefined: official EP photo by id. null: no licensed photo, show initials. */
  photo?: string | null;
}) {
  const { t, locale } = useI18n();
  const [l1, l2] = mrzLines(person, since, code);
  return (
    <article
      aria-label={`${t("card.kind")}: ${person.name}`}
      className="guilloche overflow-hidden rounded-[20px] shadow-[0_0_0_1px_color-mix(in_oklab,var(--guil)_55%,transparent),0_10px_30px_-14px_hsl(var(--shadow)/0.35)]"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="label leading-relaxed">
            {t("card.kind")}
            <br />
            <span className="text-ink">
              {institution}, {countryName(person.country, locale)}
            </span>
          </p>
          <span className="grid h-7 w-10 shrink-0 place-items-center rounded-[6px] bg-stamp font-mono text-[11px] font-bold text-stamp-ink">
            {person.country}
          </span>
        </div>
        <div className="mt-3.5 grid grid-cols-[88px_1fr] gap-4 sm:grid-cols-[104px_1fr]">
          <Portrait id={person.id} name={person.name} src={photo} className="aspect-[4/5] w-full rounded-[10px]" />
          <dl className="grid min-w-0 grid-cols-2 content-start gap-x-3 gap-y-2.5">
            <div className="col-span-2 min-w-0">
              <dt className="label text-[9.5px]">{t("card.name")}</dt>
              <dd className="display-md truncate text-[24px]">{person.name}</dd>
            </div>
            {fields.map(([label, value]) => (
              <Field key={label} label={label} value={value} />
            ))}
          </dl>
        </div>
      </div>
      <div
        aria-hidden
        className="mrz bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] px-4 py-2.5 text-[11px] text-ink sm:px-5"
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
