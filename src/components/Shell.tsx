import { BookOpen, Flag, Handshake, House, IdentificationCard, Monitor, Moon, Star, Sun } from "@phosphor-icons/react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { type ComponentType, lazy, Suspense, useCallback, useState } from "react";
import { type Key, LANGS, useI18n } from "../lib/i18n";
import { applyTheme, readTheme, type ThemePref } from "../lib/theme";
import { SearchTrigger, useSearchShortcut } from "./SearchTrigger";

const SearchDialog = lazy(() => import("./Search").then((m) => ({ default: m.SearchDialog })));

import { useOnline } from "./ui";

type IconType = ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold"; className?: string }>;

const NAV: { to: string; key: Key; long?: Key; icon: IconType; exact?: boolean }[] = [
  { to: "/", key: "nav.today", icon: House, exact: true },
  { to: "/dossiers", key: "nav.dossiers", icon: IdentificationCard },
  { to: "/lobby", key: "nav.lobby", long: "nav.lobbyLong", icon: Handshake },
  { to: "/volg", key: "nav.follow", long: "nav.followLong", icon: Star },
];

export const REPORT_URL =
  "https://github.com/sicparvisventures/mandaat/issues/new?labels=data&title=Fout%20in%20de%20data";

function useActive() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (to: string, exact?: boolean) =>
    exact
      ? path === to
      : path === to || path.startsWith(`${to}/`) || (to === "/dossiers" && path.startsWith("/dossier/"));
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display select-none tracking-[0.01em] ${className}`}>
      MANDAAT<span className="text-stamp">.</span>
    </span>
  );
}

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <fieldset className="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
      <legend className="sr-only">{t("common.lang")}</legend>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`press min-h-8 min-w-9 rounded-md px-2 font-mono text-[11px] font-semibold uppercase ${lang === l ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </fieldset>
  );
}

function ThemeSwitch() {
  const { t } = useI18n();
  const [pref, setPref] = useState<ThemePref>(readTheme);
  const opts: { v: ThemePref; icon: IconType; label: Key }[] = [
    { v: "system", icon: Monitor, label: "theme.system" },
    { v: "light", icon: Sun, label: "theme.light" },
    { v: "dark", icon: Moon, label: "theme.dark" },
  ];
  return (
    <fieldset className="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
      <legend className="sr-only">{t("nav.theme")}</legend>
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          aria-pressed={pref === v}
          aria-label={t(label)}
          title={t(label)}
          onClick={() => {
            setPref(v);
            applyTheme(v);
          }}
          className={`press grid size-8 place-items-center rounded-md ${pref === v ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink"}`}
        >
          <Icon size={15} weight={pref === v ? "fill" : "regular"} />
        </button>
      ))}
    </fieldset>
  );
}

export function Shell() {
  const { t } = useI18n();
  const isActive = useActive();
  const online = useOnline();
  const [searchOpen, setSearchOpen] = useState(false);
  const open = useCallback(() => setSearchOpen(true), []);
  useSearchShortcut(open);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r border-line bg-surface px-3 py-5 lg:flex">
        <Link to="/" className="mb-5 px-2.5">
          <Wordmark className="text-[26px]" />
        </Link>
        <SearchTrigger onOpen={open} short className="mb-3" />
        <nav className="flex flex-col gap-0.5" aria-label="Hoofdnavigatie">
          {NAV.map(({ to, key, long, icon: Icon, exact }) => {
            const on = isActive(to, exact);
            return (
              <Link
                key={to}
                // biome-ignore lint/suspicious/noExplicitAny: static nav targets
                to={to as any}
                aria-current={on ? "page" : undefined}
                className={`press flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[14px] font-semibold ${on ? "bg-stamp-soft text-stamp" : "text-muted hover:bg-sunken hover:text-ink"}`}
              >
                <Icon size={19} weight={on ? "fill" : "regular"} />
                {t(long ?? key)}
              </Link>
            );
          })}
        </nav>
        <div className="my-3 h-px bg-line" />
        <Link
          to="/bronnen"
          className={`press flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[14px] font-semibold ${isActive("/bronnen") ? "bg-stamp-soft text-stamp" : "text-muted hover:bg-sunken hover:text-ink"}`}
        >
          <BookOpen size={19} />
          {t("nav.sources")}
        </Link>
        <a
          href={REPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="press flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[14px] font-semibold text-muted hover:bg-sunken hover:text-ink"
        >
          <Flag size={19} />
          {t("nav.report")}
        </a>
        <div className="mt-auto flex flex-col gap-2 px-1">
          <LangSwitch />
          <ThemeSwitch />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky z-20 flex items-center justify-between gap-3 border-b border-line bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] py-2.5 backdrop-blur-md lg:hidden"
          style={{
            top: "env(safe-area-inset-top, 0px)",
            paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
            paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          }}
        >
          <Link to="/">
            <Wordmark className="text-[22px]" />
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
          </div>
        </header>

        {!online && (
          <p className="bg-warn/15 px-4 py-2 text-center text-[13px] font-medium text-warn">{t("common.offline")}</p>
        )}

        <main
          className="mx-auto w-full max-w-[1120px] flex-1 pt-5 pb-28 sm:pt-8 lg:pb-16"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
            paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          }}
        >
          <div className="mb-5 lg:hidden">
            <SearchTrigger onOpen={open} />
          </div>
          <Outlet />
        </main>

        {/* Mobile tab bar */}
        <nav
          aria-label="Hoofdnavigatie"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-md lg:hidden"
          style={{
            paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          {[...NAV, { to: "/bronnen", key: "nav.sources" as Key, icon: BookOpen, exact: false }].map(
            ({ to, key, icon: Icon, exact }) => {
              const on = isActive(to, exact);
              const label = key === "nav.sources" ? t("dossier.tabSources") : t(key);
              return (
                <Link
                  key={to}
                  // biome-ignore lint/suspicious/noExplicitAny: static nav targets
                  to={to as any}
                  aria-current={on ? "page" : undefined}
                  className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 pt-2 text-[10.5px] font-semibold ${on ? "text-stamp" : "text-muted"}`}
                >
                  <Icon size={22} weight={on ? "fill" : "regular"} />
                  {label}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
    </div>
  );
}

export { LangSwitch, ThemeSwitch };
