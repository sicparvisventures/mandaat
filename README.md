# Mandaat

A public file for every Member of the European Parliament: who they meet, who lobbies them and how they vote.
Built for Belgium first, covering all 720 MEPs. Free, no account, no tracking. Official open data only.

Live: https://mandaat.vercel.app

## What's inside

| Module | What it shows | Source |
| --- | --- | --- |
| Dossier | ID card, group and party, committees, roles, attendance | European Parliament Open Data API |
| Meetings | Published lobby meetings per MEP | Integrity Watch EU (from MEP declarations on europarl.europa.eu) |
| Votes | Roll-call votes this term, position per MEP | HowTheyVote.eu |
| Lobby radar | Organisations, budget, lobbyists, EP badges, who they met | EU Transparency Register |
| Commission | Meetings of commissioners, cabinets and DGs with an organisation | European Commission (data.europa.eu) |

## How it works

```
sources ──> pipeline/ (nightly GitHub Action) ──> public/data/*.json ──> Vercel Blob ──> PWA (Vite + React)
```

- `pipeline/run.ts` fetches and links the sources and writes static JSON.
- `pipeline/upload.ts` uploads only the files that changed to Vercel Blob.
- The app reads the JSON from Blob (`VITE_DATA_BASE_URL`) and caches it offline.

## Develop

```bash
pnpm install
pnpm pipeline      # builds public/data (about 300 MB of downloads the first time, cached in data/raw)
pnpm dev
```

Without running the pipeline you can point the app at the live data:

```bash
VITE_DATA_BASE_URL=https://iujbjyhzyqzv8lj6.public.blob.vercel-storage.com/data pnpm dev
```

## Principles

- Only the public role. No home address, family or health.
- No scores or judgements. Facts with the context of their source.
- Every claim links to its source.
- Visitors are not tracked. The follow list lives in the browser (IndexedDB).

## Licences

Code: AGPL-3.0. Data: the published dataset combines ODbL sources (Integrity Watch EU, HowTheyVote.eu) and is
shared under ODbL 1.0. Other sources: EP and Commission reuse policies, CC BY 4.0 for Commission meetings.
MEP photos: © European Union, European Parliament.
