# League 17-0

A mobile-first web game modeled on Sleeper's 17-0, but the player pool comes from my ESPN
fantasy league's history (league 390467). Roll a random team-season, draft a player from
its real roster, fill all 7 lineup slots (QB, 2 RB, 2 WR, TE, FLEX), then watch the lineup
replay its seasons week by week. Score **145+ PPR** every week to go **17-0**.

Personal project. Static SPA — no backend, no AWS, no credentials in the repo.

## Run it

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

## Data

The app ships with **synthetic sample data** (flagged on the Home screen). To use real
league history, replace `src/data/league-history.json` with a file matching the schema in
the build handoff (§4.2): `weekly_line`, and per season → per team → roster of
QB/RB/WR/TE players, each with `player_id`, `total_ppr`, and a 17-entry `weekly_ppr`
array (0 for bye/DNP/short seasons).

`scripts/fetch-espn.mjs` is a **local-only** helper that pulls the real data from ESPN:

```sh
cp scripts/.espn-cookies.example.json scripts/.espn-cookies.json  # gitignored
# paste your espn_s2 + SWID cookie values into it
node scripts/fetch-espn.mjs 2015 2024
```

Cookies never enter the app bundle — the JSON is baked in at build time. Spot-check the
output against the league site (ESPN's private API shifts shape, especially pre-2018).

To regenerate the sample data or the PWA icons:

```sh
npm run generate-sample
npm run generate-icons
```

## Modes

- **Normal** — season PPR totals visible while drafting.
- **Hard Mode** — draft blind; the final record is the payoff.

Best record and mode preference persist in `localStorage`.

## Deploy (Vercel)

1. Push this folder to a new **personal** GitHub repo.
2. vercel.com → Add New Project → import the repo → framework preset **Vite** → Deploy.
3. Every push redeploys. (Cloudflare Pages/Netlify: build `npm run build`, output `dist`.
   GitHub Pages: also set `base` in `vite.config.ts` to the repo name.)

Never deploy to AWS or any company infrastructure.
