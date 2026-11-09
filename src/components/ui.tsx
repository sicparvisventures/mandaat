import { ArrowsClockwise, ArrowUpRight, WifiSlash } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { photoUrl } from "../lib/data";
import { useI18n } from "../lib/i18n";

export function Portrait({
  id,
  name,
  src,
  className = "",
}: {
  id: string;
  name: string;
  /** undefined: official EP photo by id. null: no licensed photo, show initials. */
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  if (failed || src === null || (src === undefined && id.startsWith("vp-"))) {
    return (
      <div
        aria-hidden
        className={`img-outline grid place-items-center bg-sunken font-display font-bold text-muted ${className}`}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src ?? photoUrl(id)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`img-outline bg-sunken object-cover object-top ${className}`}
    />
  );
}

export function SourceStamp({ href, children }: { href?: string; children: ReactNode }) {
  const cls =
    "inline-flex max-w-full items-center gap-1 rounded-md border border-dashed border-line px-1.5 py-0.5 font-mono text-[10.5px] text-muted";
  if (!href) return <span className={cls}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${cls} press hover:border-stamp hover:text-stamp`}>
      <span className="truncate">{children}</span>
      <ArrowUpRight size={10} weight="bold" aria-hidden />
    </a>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 rounded-[14px] p-3">
      <span className="display tnum text-[26px] leading-none">{value}</span>
      <span className="text-[12px] leading-tight text-muted">{label}</span>
    </div>
  );
}

/** Ranked list with proportional ink marks. No background track: the length is the data. */
export function RankList({ items }: { items: { key: string; label: ReactNode; value: number; to?: ReactNode }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1">
          <span className="min-w-0 truncate text-[14px]">{i.to ?? i.label}</span>
          <span className="tnum font-mono text-[12px] text-muted">{i.value}</span>
          <span
            aria-hidden
            className="col-span-2 h-[5px] rounded-full bg-stamp"
            style={{ width: `${Math.max(3, (i.value / max) * 100)}%` }}
          />
        </li>
      ))}
    </ol>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-5 w-full max-w-md" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-start gap-3 p-5">
      <WifiSlash size={22} className="text-bad" aria-hidden />
      <p className="max-w-[48ch] text-[14px]">{t("common.error")}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="press inline-flex items-center gap-2 rounded-xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper"
        >
          <ArrowsClockwise size={14} weight="bold" aria-hidden />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line p-6">
      <span className="text-faint">{icon}</span>
      <p className="max-w-[52ch] text-[14px] text-muted">{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 pb-2">
      <h1 className="display text-[38px] sm:text-[48px]">{title}</h1>
      {lede && <p className="max-w-[60ch] text-[15px] text-muted">{lede}</p>}
      {children}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="display-md text-[19px]">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({
  to,
  params,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/suspicious/noExplicitAny: router typing for dynamic targets
    <Link to={to as any} params={params as any} className="text-[13px] font-semibold text-stamp hover:underline">
      {children}
    </Link>
  );
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

const FLAGS: Record<string, string> = {};
export function countryName(code: string, locale: string) {
  const key = `${locale}:${code}`;
  if (FLAGS[key]) return FLAGS[key];
  try {
    const n = new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
    FLAGS[key] = n;
    return n;
  } catch {
    return code;
  }
}
