# Vera

Vera is a source-aware content studio for generating presentation, infographic, video, podcast, document, report, white-paper, and social-post outputs from a single brief.

## What Vera Does

- Generates format-specific deliverables instead of one generic response
- Screens and ranks sources through Tavily, Europe PMC, ClinicalTrials.gov, and curated official references
- Carries source governance, operational guardrails, and compliance architecture into each output
- Exports finished deliverables plus ZIP bundles and evidence packs
- Stores generation history so prior outputs can be reopened with their evidence context intact

## Local Development

```bash
npm install
npm run dev
node server/index.mjs
```

Frontend:
- `http://127.0.0.1:3000`

Backend:
- `http://127.0.0.1:8787`

## Useful Scripts

```bash
npm run build
npm run lint
npm run lint:types
npm run dev:platform
node scripts/qc-platform.mjs
node scripts/test-source-health.mjs "hypertension screening adults guideline"
```

## Notes

- Generated runtime assets and local SQLite state live under `server/data/` and are ignored by git.
- Provider-backed delivery is optional. Vera falls back to native rendering when a provider is not configured.
