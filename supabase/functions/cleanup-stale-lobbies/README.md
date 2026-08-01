# cleanup-stale-lobbies

Prunes stale players (status-aware grace) and deletes empty lobbies. Covers the “host alone closed the tab” case when nobody is left to poll.

## Deploy

```bash
npx supabase functions deploy cleanup-stale-lobbies --project-ref <ref> --no-verify-jwt
```

## Cron (Supabase Dashboard)

1. Open **Edge Functions** → `cleanup-stale-lobbies`
2. Add a **Cron** job: `* * * * *` (every minute)
3. HTTP method: `POST`
4. Header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

The function rejects requests without the service role bearer.
