# STATUS

_Laatst bijgewerkt: 2026-11-09_

## Fase
**Fase 1 (MVP Europees Parlement): LIVE** op https://mandaat.vercel.app
Repo: https://github.com/sicparvisventures/mandaat (publiek, AGPL-3.0). Vercel-project `mandaat` in team `xinori`, git-integratie actief (push naar main = productie-deploy).

## Wat er staat
- PWA (Vite 8, React 19, TS 7, TanStack Router/Query, Tailwind 4, Phosphor, Radix). NL/FR/EN, licht/donker/systeem.
- Pagina's: Vandaag (feed + 22 Belgische MEP's + meest gelobbyd), Dossiers (filter land/fractie), Dossier (eID-kaart, meetings, stemmingen, functies, bronnen), Lobbyradar + organisatiepagina (register, Commissie-meetings), Volglijst (IndexedDB), Bronnen en methode.
- Pipeline `pipeline/run.ts` → `public/data` → `pipeline/upload.ts` (alleen gewijzigde bestanden, manifest) → Vercel Blob store `mandaat-data` (fra1, public): https://iujbjyhzyqzv8lj6.public.blob.vercel-storage.com/data
- Env `VITE_DATA_BASE_URL` staat in Vercel (prod/preview/dev).
- Workflows: `.github/workflows/ci.yml` (typecheck, lint, test, build), `.github/workflows/data.yml` (nachtelijk 03:15 UTC).

## Open, actie gebruiker
- GitHub secret `BLOB_READ_WRITE_TOKEN` zetten (geblokkeerd voor Claude): `vercel env pull` → waarde in `.env.local` → `gh secret set BLOB_READ_WRITE_TOKEN --repo sicparvisventures/mandaat`. Tot dan faalt de nachtelijke data-job; data is nu handmatig geüpload op 2026-11-09.

## Bekende beperkingen
- EP-site blokkeert geautomatiseerde clients voor de meetings-CSV → we gebruiken Integrity Watch EU (ODbL), loopt enkele weken achter (laatste update 22-10-2026).
- Loon op ID-kaart: netto € 8.772,70 (Euronews 7-10-2026), constante `MEP_SALARY_NET_EUR` in src/pages/Dossier.tsx.
- Registercategorieën staan in het Engels (officiële labels).

## Volgende stappen (voorstel)
1. Fase 2 Geldstroom: EU FTS + Kohesio + TED voor Belgische ontvangers.
2. Fase 3 Belgische parlementen: Kamer + Vlaams Parlement (ws.vlpar.be), Rekenhof-mandaten. Eerst GBA-beslissing 103/2024 lezen.
3. Eigen domein, Playwright e2e-tests, deelbare dossierkaart als afbeelding.
