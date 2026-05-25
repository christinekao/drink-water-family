# Production Deploy

Recommended free stack:

- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1

## What is deployed

- `prototype/index.html`
- `prototype/app.js`
- `prototype/styles.css`
- `functions/api/*`

## What is not deployed

- `prototype/server.py`
- `prototype/drink_water.sqlite3`
- local-only browser storage

## Setup

1. Create a D1 database in Cloudflare.
2. Add a D1 binding named `DB` to your Pages project.
3. Deploy the repo as a Cloudflare Pages project.
4. Set the build output directory to `dist`.
5. Run the build script before deploy:

```bash
npm run build
```

## Local preview for production mode

```bash
npm run build
npx wrangler pages dev dist --d1 DB=<YOUR_D1_DATABASE_ID>
```

## Notes

- The frontend talks to `/api/*`.
- The API writes to D1, so all family devices share the same data.
- If you keep the free plan, the app is suitable for hobby and family use.

