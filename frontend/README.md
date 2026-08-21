# SetQuant frontend

Next.js 16 / React 19 / Tailwind v4 app for SetQuant — the live feed, insider
leaderboard, and per-stock candlestick charts. See the [root README](../README.md)
for the full project.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Env

Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8080`) in `.env.local` to point at
a running backend. Leave it unset and the app falls back to bundled dummy data in
`lib/dummy-data.ts` — enough to work on UI without a backend or database.

## Build

```bash
npm run build
npm start
```

Deployed on Vercel with root directory `frontend`; pushes to `main` auto-deploy.
