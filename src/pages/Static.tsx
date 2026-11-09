import { ArrowUpRight, Check, LinkSimple, Star } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LangSwitch, REPORT_URL, ThemeSwitch } from "../components/Shell";
import { EmptyState, PageHeader, PageSkeleton, Portrait, SectionTitle } from "../components/ui";
import { useMeps, useMeta } from "../lib/data";
import { useI18n } from "../lib/i18n";
import { decodeShare, encodeShare, useWatchlist } from "../lib/watchlist";

export function Follow() {
  const { t } = useI18n();
  const { ids, merge } = useWatchlist();
  const meps = useMeps();
  const [incoming, setIncoming] = useState(() => (typeof location === "undefined" ? [] : decodeShare(location.hash)));
  const [copied, setCopied] = useState<"idle" | "copied" | "manual">("idle");
  if (meps.isPending) return <PageSkeleton />;
  const list = ids.map((id) => meps.data?.find((m) => m.id === id)).filter((m) => m != null);
  const fresh = incoming.filter((id) => !ids.includes(id) && meps.data?.some((m) => m.id === id));
  const shareUrl = `${location.origin}/volg${encodeShare(ids)}`;
  const clearHash = () => {
    history.replaceState(null, "", location.pathname);
    setIncoming([]);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("follow.title")} lede={t("follow.lede")} />
      {fresh.length > 0 && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[14px]">{t("follow.importText", { n: fresh.length })}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await merge(fresh);
                clearHash();
              }}
              className="press rounded-xl bg-stamp px-3.5 py-2 text-[13px] font-semibold text-stamp-ink"
            >
              {t("follow.import")}
            </button>
            <button
              type="button"
              onClick={clearHash}
              className="press rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-semibold"
            >
              {t("follow.ignore")}
            </button>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState
          icon={<Star size={22} />}
          text={t("follow.empty")}
          action={
            <Link to="/dossiers" className="press rounded-xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper">
              {t("follow.browse")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
            <p className="text-[13.5px] text-muted">{t("follow.shareText")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied("copied");
                  } catch {
                    setCopied("manual");
                  }
                }}
                className="press inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper"
              >
                {copied === "copied" ? (
                  <Check size={14} weight="bold" aria-hidden />
                ) : (
                  <LinkSimple size={14} weight="bold" aria-hidden />
                )}
                {copied === "copied" ? t("follow.copied") : t("follow.share")}
              </button>
              {copied === "manual" && (
                <input
                  id="share-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={t("follow.share")}
                  className="card min-w-0 flex-1 rounded-xl px-3 py-2 font-mono text-[12px]"
                />
              )}
            </div>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {list.map((m) => (
              <li key={m.id}>
                <Link to="/dossier/$id" params={{ id: m.id }} className="press card flex items-center gap-3 p-3">
                  <Portrait id={m.id} name={m.name} className="h-[60px] w-12 rounded-[8px]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{m.name}</span>
                    <span className="truncate text-[12.5px] text-muted">{m.groupLabel ?? m.group}</span>
                  </span>
                  <span className="display tnum text-[22px]">{m.meetings12m}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const COPY = {
  nl: {
    lede: "Mandaat toont alleen gegevens die officieel gepubliceerd zijn. Elke nacht halen we de bronnen opnieuw op, koppelen we ze aan elkaar en publiceren we het resultaat.",
    rules: [
      ["Alleen de publieke functie", "We tonen wat iemand doet als verkozene. Geen privéadres, familie of gezondheid."],
      ["Geen oordeel", "We geven geen scores of labels. Je ziet de feiten met de context van de bron."],
      ["Elke bewering heeft een bron", "Bij elk gegeven staat waar het vandaan komt, met een link naar het origineel."],
      [
        "Jij wordt niet gevolgd",
        "Geen account, geen cookies, geen advertenties. Je volglijst staat alleen op je toestel.",
      ],
    ],
    limits: "Wat je hier niet ziet",
    limitsText:
      "Lobbymeetings worden door Europarlementsleden zelf gepubliceerd. Ontbrekende meetings zijn dus niet zichtbaar. Belgische federale en regionale parlementsleden hoeven hun meetings niet te publiceren; zij komen in een volgende fase, met mandaten en stemmingen.",
    salary: "Loon op de ID-kaart",
    salaryText:
      "Netto maandloon van een Europarlementslid, € 8.772,70, zoals gerapporteerd door Euronews op 7 oktober 2026. Vergoedingen komen daar bovenop.",
    settings: "Instellingen",
    open: "Open source",
    openText:
      "De code staat publiek op GitHub onder de AGPL-3.0-licentie. Fout gezien of een bron die ontbreekt? Meld het daar.",
  },
  fr: {
    lede: "Mandaat ne montre que des données publiées officiellement. Chaque nuit, nous récupérons les sources, les relions entre elles et publions le résultat.",
    rules: [
      [
        "Uniquement la fonction publique",
        "Nous montrons ce qu'une personne fait en tant qu'élu. Pas d'adresse privée, de famille ou de santé.",
      ],
      ["Pas de jugement", "Pas de scores ni d'étiquettes. Vous voyez les faits avec le contexte de la source."],
      ["Chaque affirmation a une source", "Chaque donnée indique d'où elle vient, avec un lien vers l'original."],
      [
        "Vous n'êtes pas suivi",
        "Pas de compte, pas de cookies, pas de publicité. Votre liste reste sur votre appareil.",
      ],
    ],
    limits: "Ce que vous ne voyez pas ici",
    limitsText:
      "Les réunions de lobbying sont publiées par les députés européens eux-mêmes. Les réunions non publiées n'apparaissent donc pas. Les parlementaires belges fédéraux et régionaux ne doivent pas publier leurs réunions ; ils suivront dans une prochaine phase, avec mandats et votes.",
    salary: "Salaire sur la carte",
    salaryText:
      "Salaire mensuel net d'un député européen, 8 772,70 €, selon Euronews le 7 octobre 2026. Les indemnités s'y ajoutent.",
    settings: "Réglages",
    open: "Open source",
    openText:
      "Le code est public sur GitHub sous licence AGPL-3.0. Une erreur ou une source manquante ? Signalez-la là-bas.",
  },
  en: {
    lede: "Mandaat only shows data that has been officially published. Every night we fetch the sources again, link them together and publish the result.",
    rules: [
      ["Only the public role", "We show what someone does as an elected official. No home address, family or health."],
      ["No judgement", "No scores or labels. You see the facts with the context of the source."],
      ["Every claim has a source", "Every data point says where it comes from, with a link to the original."],
      ["You are not tracked", "No account, no cookies, no ads. Your follow list stays on your device."],
    ],
    limits: "What you don't see here",
    limitsText:
      "Lobby meetings are published by MEPs themselves, so unpublished meetings don't show up. Belgian federal and regional members of parliament don't have to publish their meetings; they come in a later phase, with mandates and votes.",
    salary: "Salary on the ID card",
    salaryText:
      "Net monthly salary of an MEP, €8,772.70, as reported by Euronews on 7 October 2026. Allowances come on top.",
    settings: "Settings",
    open: "Open source",
    openText:
      "The code is public on GitHub under the AGPL-3.0 licence. Spotted an error or a missing source? Report it there.",
  },
} as const;

export function Sources() {
  const { t, lang, date, num } = useI18n();
  const meta = useMeta();
  const c = COPY[lang];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("sources.title")} lede={c.lede} />

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {c.rules.map(([h, p]) => (
          <div key={h} className="flex flex-col gap-1 border-t-2 border-ink pt-3">
            <dt className="display-md text-[17px]">{h}</dt>
            <dd className="text-[14px] text-muted">{p}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <SectionTitle>{t("dossier.tabSources")}</SectionTitle>
        {meta.data ? (
          <div className="overflow-x-auto rounded-2xl shadow-[0_0_0_1px_var(--line)]">
            <table className="w-full min-w-[560px] border-collapse bg-surface text-left text-[13.5px]">
              <tbody className="divide-y divide-line">
                {meta.data.sources.map((s) => (
                  <tr key={s.key}>
                    <td className="p-3.5 align-top">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold hover:text-stamp"
                      >
                        {s.name}
                        <ArrowUpRight size={12} weight="bold" aria-hidden />
                      </a>
                      <span className="block text-[12px] text-muted">{s.licence}</span>
                    </td>
                    <td className="tnum p-3.5 text-right align-top font-mono text-[12px] text-muted">
                      {num(s.records)}
                    </td>
                    <td className="tnum p-3.5 text-right align-top font-mono text-[12px] text-muted">
                      {date(s.fetchedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PageSkeleton />
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <SectionTitle>{c.limits}</SectionTitle>
          <p className="text-[14px] text-muted">{c.limitsText}</p>
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>{c.salary}</SectionTitle>
          <p className="text-[14px] text-muted">
            {c.salaryText}{" "}
            <a
              className="font-semibold text-stamp hover:underline"
              href="https://www.euronews.com/2026/10/07/exclusive-the-left-group-wants-to-halve-mep-salaries"
              target="_blank"
              rel="noreferrer"
            >
              Euronews
            </a>
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>{c.open}</SectionTitle>
          <p className="text-[14px] text-muted">{c.openText}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="https://github.com/sicparvisventures/mandaat"
              target="_blank"
              rel="noreferrer"
              className="press card inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold"
            >
              GitHub <ArrowUpRight size={12} weight="bold" aria-hidden />
            </a>
            <a
              href={REPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[13px] font-semibold text-paper"
            >
              {t("nav.report")}
            </a>
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <SectionTitle>{c.settings}</SectionTitle>
          <div className="flex flex-wrap items-center gap-3">
            <LangSwitch />
            <ThemeSwitch />
          </div>
        </section>
      </div>
    </div>
  );
}
