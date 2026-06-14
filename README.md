# Epargne App

Small React app to track savings, projections, and budget.

## Privacy setup

This repo is configured so your real savings data stays local.

- `src/data.ts` contains sample data only
- `Epargne_Finale.xlsx` is ignored by git
- `.local/epargne-data.json` is generated locally and ignored by git
- the app auto-loads that local JSON in dev mode when it exists

So you can push the repo without exposing your real numbers.

## Project structure

- `src/data.ts`: sample data committed to the repo
- `scripts/import-private-excel.mjs`: imports your private Excel file
- `.local/epargne-data.json`: local generated private data

## Commands

Install dependencies:

```bash
npm install
```

Import your private Excel data:

```bash
npm run import:excel
```

Import into a specific personal profile:

```bash
npm run import:excel -- --profile="Moi"
```

Import while preserving the latest exported document as the merge base:

```bash
npm run import:excel -- --document="/Users/aloisgoeury/Downloads/epargne-data-4.json" --profile="Moi"
```

Start the app in dev mode:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

## Recommended workflow

1. Put your real file at `Epargne_Finale.xlsx`
2. Run `npm run import:excel`
3. Run `npm run dev`
4. Work normally
5. Commit and push safely since private files are ignored

## Notes

- If your Excel file changes, run `npm run import:excel` again
- In dev mode, saving budget/simulation/profile changes now updates `.local/epargne-data.json` directly when possible
- The importer now preserves your existing profiles, budgets, and shared setup, and only refreshes the imported financial data for one personal profile
- By default the importer uses `.local/epargne-data.json` as its base; if your freshest data lives in an exported file from Downloads, pass it with `--document=...`
- The private auto-load is for local dev only
- Production builds use the sample data unless you add another private deployment flow
