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

## Deploy on Vercel

In PowerShell, run this from the project directory containing the authorized copy file. It copies the compressed value to your clipboard.

```powershell
node -e "const fs=require('node:fs'),z=require('node:zlib');process.stdout.write(z.gzipSync(fs.readFileSync('client/Website_Page_Copy_v1_3.md'),{level:9}).toString('base64'))" | Set-Clipboard
```

Add the clipboard value as the sensitive build environment variable `LTTDTW_SITE_COPY_GZIP_BASE64` for the Vercel environments you deploy to. Use the Astro framework preset and Node.js 24.x, then redeploy. When retrying an install failure, redeploy with the build cache disabled.
