import { Handshake, IdentificationCard, MagnifyingGlass, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import MiniSearch from "minisearch";
import { useMemo, useState } from "react";
import { q } from "../lib/data";
import { useI18n } from "../lib/i18n";
import type { SearchDoc } from "../lib/types";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const docs = useQuery({ ...q.search(), enabled: open });

  const index = useMemo(() => {
    if (!docs.data) return null;
    const ms = new MiniSearch<SearchDoc>({
      fields: ["name", "sub"],
      storeFields: ["id", "kind", "name", "sub"],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 3 } },
      processTerm: (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
    });
    ms.addAll(docs.data.map((d) => ({ ...d, id: `${d.kind}:${d.id}`, rawId: d.id })));
    return ms;
  }, [docs.data]);

  const results = useMemo(() => {
    if (!index || term.trim().length < 2) return [];
    return index.search(term).slice(0, 12) as unknown as (SearchDoc & { id: string })[];
  }, [index, term]);

  const go = (r: SearchDoc & { id: string }) => {
    const [, ...rest] = r.id.split(":");
    const id = rest.join(":");
    onOpenChange(false);
    setTerm("");
    if (r.kind === "mep") navigate({ to: "/dossier/$id", params: { id } });
    else navigate({ to: "/lobby/$id", params: { id } });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[hsl(var(--shadow)/0.35)] backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-0 top-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-b-[20px] bg-surface shadow-2xl sm:top-[12dvh] sm:rounded-[20px]"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Dialog.Title className="sr-only">{t("search.label")}</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <MagnifyingGlass size={18} weight="bold" className="text-muted" aria-hidden />
            <input
              id="search-input"
              // biome-ignore lint/a11y/noAutofocus: search dialog needs immediate focus
              autoFocus
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  go(results[active]);
                }
              }}
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
              className="min-w-0 flex-1 bg-transparent py-1 text-[16px] outline-none placeholder:text-faint"
            />
            <Dialog.Close className="press grid size-9 place-items-center rounded-lg text-muted hover:bg-sunken">
              <X size={18} weight="bold" aria-label="Sluiten" />
            </Dialog.Close>
          </div>
          <ul className="overflow-y-auto p-2">
            {term.trim().length >= 2 && results.length === 0 && docs.data && (
              <li className="px-3 py-6 text-[14px] text-muted">{t("search.none")}</li>
            )}
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? "bg-stamp-soft" : ""}`}
                >
                  {r.kind === "mep" ? (
                    <IdentificationCard size={18} className="shrink-0 text-stamp" aria-hidden />
                  ) : (
                    <Handshake size={18} className="shrink-0 text-muted" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                    <span className="block truncate text-[12px] text-muted">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
