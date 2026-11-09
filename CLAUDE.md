# Mandaat. Repo github.com/sicparvisventures/mandaat (lokale map ~/gangsters)

Gratis PWA voor België/Europa: een publiek "dossier" (omgekeerde digitale ID) per politicus.
Wie ontmoeten ze, wie lobbyt hen, waar gaat ons belastinggeld naartoe. Alleen officiële open data, elke bewering met bronstempel.

## Start van elke sessie
1. Lees `memory/STATUS.md` (waar staan we, volgende stap).
2. Lees `memory/DECISIONS.md` (wat is beslist) en de laatste entries in `memory/LOG.md`.
3. Mockup + scope: `docs/mockup/index.html` (gepubliceerd als artifact https://claude.ai/artifact/VJAGBmePNrmqXvjg5CBhgQ).
4. Live: https://mandaat.vercel.app. Data: `pnpm pipeline` en `pnpm pipeline:upload` (token in `.env.local` via `vercel env pull`).

## Werkafspraken
- Taal met de gebruiker: Nederlands (informeel). Code en commits: Engels, Conventional Commits.
- Git author: `sicparvisventures` (local config). Na **elke** wijziging: commit + push naar `main` (expliciete wens gebruiker, D-002). Stage expliciete paden, nooit blind `git add -A`.
- Vercel git-integratie: elke push naar main = auto deploy.
- Fase-gated: niet implementeren zonder goedkeuring van de huidige fase.
- Update `memory/STATUS.md` en `memory/LOG.md` aan het einde van elke werksessie; beslissingen in `memory/DECISIONS.md`.

## Ethiek / juridisch (hard)
- Alleen data over de publieke functie; geen privé-adres, familie, gezondheid.
- Geen eigen oordeel/score; feiten + context ("vrijwillig gedeclareerd").
- Elke bewering: bron + datum + link. "Meld een fout" per feit.
- Burgers worden niet getrackt: geen accounts in MVP, geen cookies, volglijst lokaal (IndexedDB).
- Lees GBA-beslissing 103/2024 (Cumuleo) vóór Belgische mandaatdata getoond wordt.
- Voorbeelddata altijd zichtbaar als fictief markeren.

## Design
- Tokens in `src/styles.css` (oklch, licht/donker). Eén accent: stempelviolet. Radius 8/12/16/20. Geen em-dashes in UI-tekst.
- Fonts: Archivo (display, smalle breedte), Public Sans (tekst), JetBrains Mono (labels/data). Iconen: Phosphor.
