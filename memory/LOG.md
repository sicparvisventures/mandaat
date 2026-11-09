# LOG

## 2026-11-09 — sessie 1
- Opdracht: app "digitale ID voor politici" (België/Europa, OSINT/open data, gratis PWA, TS + Vite, Vercel).
- Bronnen onderzocht (EP API, transparantieregister, LobbyFacts, HowTheyVote, Parltrack, FTS, Kohesio, TED, Vlaams Parlement, Kamer, Rekenhof, Wikidata, OpenSanctions).
- Mockup-artifact gepubliceerd met scope, bronnen, stack, roadmap, 4 mobiele schermen + desktop.
- Repo + geheugen opgezet. Wacht op goedkeuring.

## 2026-11-09, sessie 1 (vervolg)
- Goedkeuring gekregen; GitHub-repo `mandaat` publiek aangemaakt, Vercel-project + Blob-store opgezet.
- Bronnen geverifieerd (subagent), pipeline gebouwd: EP API, Integrity Watch, Transparantieregister, HowTheyVote, Commissie-meetings.
- App gebouwd, design-pass met design-taste-frontend + better-ui (geen em-dashes, één accent, concentric radius, scale 0.96 press, echte EP-foto's).
- Live op https://mandaat.vercel.app. Secret voor nachtelijke job nog door gebruiker te zetten.

## 2026-11-09, sessie 1 (fase 2 en 3a)
- Gebruiker: "ga verder met de volgende fases" + vraag of volglijst uniek is per bezoeker (ja, per browser; deellink toegevoegd).
- Twee research-agents: geldbronnen (FTS/Kohesio/TED) en Belgische parlementen + GBA 103/2024.
- Geldstroom en Vlaams Parlement gebouwd, getest (7 unit tests), live.
