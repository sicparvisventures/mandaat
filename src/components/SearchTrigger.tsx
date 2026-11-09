import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useI18n } from "../lib/i18n";

export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}

export function SearchTrigger({
  onOpen,
  className = "",
  short = false,
}: {
  onOpen: () => void;
  className?: string;
  short?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`press card flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[14px] text-muted hover:text-ink ${className}`}
    >
      <MagnifyingGlass size={17} weight="bold" aria-hidden />
      <span className="flex-1 truncate">{short ? t("search.label") : t("search.placeholder")}</span>
      <kbd className="hidden rounded-md border border-line px-1.5 font-mono text-[11px] lg:inline">/</kbd>
    </button>
  );
}
