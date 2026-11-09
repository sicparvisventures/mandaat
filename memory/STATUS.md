# STATUS

_Laatst bijgewerkt: 2026-11-09_

## Fase
**Fase 0 — scope + mockup.** Wacht op goedkeuring gebruiker. Niets implementeren vóór akkoord.

## Gedaan
- Repo geïnitialiseerd (author sicparvisventures), CLAUDE.md + memory/ opgezet.
- Bronnenonderzoek: EP Open Data API v2 geverifieerd (`/meps`, `/meps-declarations`, `/meetings/{id}/vote-results`, filter `country-of-representation=BE` werkt).
- Mockup + scope-artifact: https://claude.ai/artifact/VJAGBmePNrmqXvjg5CBhgQ (bron: `docs/mockup/index.html`).

## Open vragen aan gebruiker (zie mockup, sectie "Jouw beslissingen")
1. Naam: Mandaat (advies) / Werkgever / Publiek Dossier
2. Startniveau: EP eerst (advies) of Kamer eerst
3. Talen: NL+FR+EN vanaf start (advies)
4. Open source: publieke repo + AGPL-3.0 (advies) — nu privé
5. Visuele richting: omgekeerde eID-kaart (guilloche, stempelinkt, MRZ)
6. beautifului.dev niet gevonden — link vragen

## Volgende stap na goedkeuring (fase 1)
Scaffold Vite + React 19 + TS + TanStack Router + Tailwind v4 + vite-plugin-pwa; Vercel-project koppelen (git-integratie);
pipeline `pipeline/` met EP API → JSON → Vercel Blob; eerste dossierpagina voor de 22 Belgische MEP's.
