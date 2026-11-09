# DECISIONS

- **D-001 (2026-11-09)** Stack-voorstel: Vite + React 19 + TypeScript strict, TanStack Router/Query, Tailwind v4 + Radix/shadcn, vite-plugin-pwa, MiniSearch, DuckDB-WASM (alleen geldstroom), Paraglide i18n. Data statisch: nachtelijke GitHub Actions-pipeline → Vercel Blob (public). Geen DB in MVP. _Status: voorstel, wacht op akkoord._
- **D-002 (2026-11-09)** Git: author sicparvisventures; commit + push naar main na elke wijziging (expliciete wens gebruiker, overschrijft branch/PR-flow). Vercel auto-deploy via git. _Status: beslist door gebruiker._
- **D-003 (2026-11-09)** Privacy: burgers niet tracken (geen accounts/cookies in MVP); alleen publieke-functiedata over politici; bronstempel op elke bewering. _Status: voorstel._
- **D-004 (2026-11-09)** Gebruiker keurde alle adviezen goed: naam **Mandaat**, EP eerst, NL/FR/EN, publieke repo AGPL-3.0, eID-richting. D-001 en D-003 daarmee beslist.
- **D-005 (2026-11-09)** Meetings via Integrity Watch EU (ODbL) i.p.v. EP-CSV: europarl.europa.eu blokkeert niet-browser-clients; we omzeilen dat niet.
- **D-006 (2026-11-09)** Geen Paraglide: eigen getypte i18n-dictionary (`src/lib/i18n.tsx`), sleutels type-checked. Geen Motion: CSS-transities volstaan.
- **D-007 (2026-11-09)** Organisatiedossiers in 256 shards (`src/lib/shard.ts`) zodat de nachtelijke upload ~1000 bestanden telt i.p.v. ~33k; upload enkel gewijzigde bestanden.
- **D-008 (2026-11-09)** Ngo's geven totaal budget i.p.v. lobbykosten: apart getoond (`costKind: "total"`), nooit als lobbykosten.
- **D-009 (2026-11-09)** Geldstroom: EU-instellingen, Joint Undertakings, agentschappen, internationale organisaties en privépersonen uit FTS weggelaten (bedrag apart getoond). TED-waarden niet optellen per winnaar.
- **D-010 (2026-11-09)** Vlaams Parlement eerst (officiële API + open licentie), Kamer daarna. Geen VP-foto's zonder toestemming. Volglijst-ids met prefix `vp-` voor Vlaamse leden.
