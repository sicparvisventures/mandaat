# STATUS

_Laatst bijgewerkt: 2026-11-09_

## Fase
**Fase 1 (EP), fase 2 (Geldstroom) en fase 3a (Vlaams Parlement): LIVE** op https://mandaat.vercel.app
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

## Fase 2 Geldstroom (2026-11-09)
- `pipeline/money.ts`: FTS 2023-2025 (BE, zonder EU-instellingen/JU/agentschappen/privépersonen, apart gerapporteerd), Kohesio 2014-2027 (bulk-CSV per land), TED award notices BE laatste 12 mnd (API v3, 1,1 s pauze).
- Ontvangers gekoppeld op KBO, anders op naam; link naar lobbyregister bij naamgelijkheid. Pagina's `/geld`, `/geld/$id`.
- TED-bedragen kunnen maxima van raamovereenkomsten zijn: we tonen aantallen, geen sommen per winnaar.
- Geen landbouwsubsidies: geen downloadbaar bestand gevonden.

## Fase 3a Vlaams Parlement (2026-11-09)
- `pipeline/vlaams.ts`: 124 leden via ws.vlpar.be (Accept: application/json nodig), commissies, andere mandaten, loopbaan, aanwezigheid, schriftelijke vragen (search-API).
- Naamstemmingen uit bijlage van definitieve Handelingen-PDF's (pdftotext), 859 stemmingen in 96 zittingen; titels uit de tekst + agendakop. Ongekoppelde namen = vooral ex-leden/ministers.
- Geen foto's: licentie onduidelijk, initialen tot toestemming. Geen privégegevens (geboortedatum, e-mail, adres).
- Vergoeding op kaart: € 80.881 bruto/jaar (Rekenhof mandatenlijst 2024).
- Juridisch: GBA 103/2024 wees klacht tegen Cumuleo af (vrijheid van meningsuiting/watchdog weegt door); regels: officiële data in officiële vorm, bron+datum, correctieproces, bezwaren per geval afwegen.

## Volgende stappen (voorstel)
1. Fase 3b De Kamer: ledenlijst (HTML, windows-1252), naamstemmingen uit integraal verslag (HTML, zelfde dag), Crawl-delay 5 s.
2. Rekenhof-mandatenlijst 2024 (PDF 91 MB) koppelen voor bezoldigd/onbezoldigd per mandaat.
3. Toestemming vragen voor foto's (Vlaams Parlement, Kamer). Privacyverklaring + bezwaarprocedure (GBA-kader).
4. Eigen domein, e2e-tests, deelbare dossierkaart als afbeelding.
