# Let the Tool Do the Work

Astro website source and public assets.

## Run locally

Place the authorized site copy at `client/Website_Page_Copy_v1_3.md`. Astro reads this file at build time. Obtain it through your project handoff and keep it local.

```sh
npm ci
npm run dev
npm run build
```

Run `npm run check:copy` to validate the copy inventory and `node scripts/check-film-motion.mjs` to check the scroll timeline.
