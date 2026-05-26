# LifeSync Calendar

Starter scaffold for the LifeSync Calendar web app (React + Tailwind + Supabase).

Quick start:

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file with your Supabase keys:

```
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run dev server

```bash
npm run dev
```

This scaffold includes core pages, a Supabase client wrapper, and PWA basics. Next steps: implement calendar UI, OAuth integrations, realtime sync, notifications, and onboarding flow.

Supabase setup:

1. In your Supabase project, run the SQL in `supabase.sql` to create the `events` table.

2. Ensure you set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `.env` file at project root.

3. The calendar UI uses realtime Postgres changes; you may need to enable Realtime (pg_changes) in Supabase settings.

OAuth provider setup:

1. To enable Google and Microsoft calendar connections, configure OAuth providers in your Supabase project settings (Authentication → Providers).
	- For Google: enable the Google provider and add the redirect URL (e.g., `http://localhost:5173/` or your deployed URL). The app requests calendar scopes.
	- For Microsoft/Azure: enable the Azure provider and configure client id/secret and redirect URLs. Request `Calendars.ReadWrite` scope for full calendar access.

2. After OAuth configuration, the `Connected Accounts` page exposes buttons to start the OAuth flow. The redirect will sign the user in via Supabase.

ICS import:

Use the `Connected Accounts` page to upload `.ics` files; basic parsing will import VEVENT entries into the `events` table.

Server-side token refresh (Edge Function):

1. Deploy the Edge Function in `functions/refresh-token` to your Supabase project. It expects these environment variables set in the function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`.

2. The function accepts POST JSON: `{ "user_id": "<user uuid>", "provider": "google" }` and will refresh the access token using the stored `refresh_token` in the `oauth_tokens` table and update it.

3. Configure `VITE_REFRESH_TOKEN_FN` in your `.env` to point to the deployed function URL so the frontend can request refreshed tokens when needed.

Saving tokens after OAuth completes:

1. Deploy the `save-token` Edge Function (`functions/save-token`). It expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the function's environment.

2. After completing the OAuth exchange (e.g., in a server-side callback or on the client if you receive provider tokens), call the `save-token` function with JSON payload:

```
{ "user_id": "<user uuid>", "provider": "google", "access_token": "...", "refresh_token": "...", "expires_in": 3600, "scope": "...", "token_type": "Bearer", "provider_account_id": "provider-specific-id" }
```

3. You can use `src/lib/saveToken.js` helper to call the function from the client or server.

Security note: Only call the `save-token` function from a trusted backend or from authenticated user context; it writes tokens using the Supabase service role key.

Direct OAuth callback flow (server-side exchange)

1. You can use the `oauth-callback` Edge Function (`functions/oauth-callback`) as the `redirect_uri` for provider OAuth consent. Register the callback URL in provider developer settings and set `OAUTH_CALLBACK_URL` for the function.

2. When starting the OAuth flow from the client, include a `state` parameter containing a base64-encoded JSON with the `user_id` and optional `return_to` URL. Example state: `btoa(JSON.stringify({ user_id: '<uuid>', return_to: 'https://app.example.com/connected' }))`.

3. After provider redirects to the `oauth-callback` function, the function exchanges the code for tokens using provider client secrets, and upserts into the `oauth_tokens` table.

4. The frontend includes direct helper buttons (in `Connected Accounts`) that build provider URLs and redirect users to the provider consent screen. These buttons require `VITE_GOOGLE_CLIENT_ID`, `VITE_MS_CLIENT_ID`, and `VITE_OAUTH_CALLBACK_URL` configured in `.env`.

Security: The `oauth-callback` function performs the code exchange using client secrets (kept in the function environment) and writes tokens using the service role key. Do not expose client secrets on the frontend.





# LifeSync-Calendar