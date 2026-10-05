# Deploy EcoBuild to Vercel

EcoBuild is a React/Vite single-page application. Vercel serves the `dist` output; Firebase Auth and Firestore remain the existing backend. No Express server or new Vercel Function is required for the current application.

## Import from GitHub

1. Import `Adithya010208/new-eco` into Vercel and choose the `main` production branch.
2. Leave Root Directory at the repository root (`.`). Use the Vite framework preset and Node.js **24.x**.
3. The committed `vercel.json` sets Install Command to `npm ci`, Build Command to `npm run lint && npm run build`, and Output Directory to `dist`.
4. Add the Firebase Web App configuration below in Vercel's Environment Variables before deploying. Set the appropriate Production/Preview scopes. Redeploy after changing variables because Vite embeds them at build time.
5. Deploy, then add the exact Vercel production hostname (and any preview hostname used for sign-in) under Firebase Console → Authentication → Settings → Authorized domains. Keep the existing Firebase `authDomain` from the registered Web App configuration.

## Firebase environment variables

Copy values from Firebase Console → Project settings → Your apps → the registered Web App. The intended existing project is `eco-build-aa966`, with database `(default)`.

| Variable | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Registered Firebase Web App API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Registered auth domain, normally `eco-build-aa966.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `eco-build-aa966` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Exact registered storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Registered sender ID |
| `VITE_FIREBASE_APP_ID` | Registered Web App ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `(default)` |

Without Firebase configuration, EcoBuild remains usable in its existing local Demo Mode. Cloud sign-in and persistence require Firebase configuration, enabled Google sign-in, the existing Firestore database/rules and an authorized deployment hostname. Vercel does not deploy Firebase rules; retain the current rules and schema.

Firebase Web SDK configuration is public client configuration. Do not put service-account JSON, private keys or Gemini API secrets in `VITE_` variables: Vite exposes those variables to browser code. The current AI service deliberately uses its existing deterministic fallback; adding `GEMINI_API_KEY` alone does not enable a live AI proxy. Voice guidance uses browser speech synthesis and requires no application speech API key.

## Routing and validation

The SPA rewrite allows direct visits and refreshes on `/components`, `/projects/:id`, `/workspaces/:id`, `/studio`, `/network`, `/leaderboards`, `/impact` and `/profile`. Vercel serves existing static output assets before the SPA fallback.

For local checks:

```bash
npm ci
npm run lint
npm run build
npx tsx src/utils/matching.test.ts
npx tsx src/utils/phase4a.test.ts
npx tsx src/utils/gamification.test.ts
npm run preview
```

After deployment, refresh a deep project URL, open both 3D guides, and check that JS/CSS assets return successfully. For cloud operation, test Google sign-in and a private inventory read/write using an authorized account. Existing large-bundle warnings are advisory; they do not prevent a successful build.

References: [Vercel Vite SPA deployment](https://vercel.com/docs/frameworks/frontend/vite), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite environment variables](https://vite.dev/guide/env-and-mode).
