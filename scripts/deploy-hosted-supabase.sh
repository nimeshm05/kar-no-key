#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF in .env.local}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY in .env.local}"
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN in .env.local}"
: "${YOUTUBE_API_KEY:?Missing YOUTUBE_API_KEY in .env.local}"
: "${PLAYER_SESSION_SECRET:?Missing PLAYER_SESSION_SECRET in .env.local}"

SONG_SEARCH_PROVIDER="${SONG_SEARCH_PROVIDER:-youtube}"

export SUPABASE_ACCESS_TOKEN

echo "→ Linking project ${SUPABASE_PROJECT_REF}..."
npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --yes

echo "→ Pushing database migrations..."
npx supabase db push --yes

echo "→ Setting Edge Function secrets..."
SECRETS_ARGS=(
  "SONG_SEARCH_PROVIDER=$SONG_SEARCH_PROVIDER"
  "YOUTUBE_API_KEY=$YOUTUBE_API_KEY"
  "PLAYER_SESSION_SECRET=$PLAYER_SESSION_SECRET"
)
if [[ -n "${CORS_ALLOWED_ORIGINS:-}" ]]; then
  SECRETS_ARGS+=("CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS")
fi

npx supabase secrets set \
  "${SECRETS_ARGS[@]}" \
  --project-ref "$SUPABASE_PROJECT_REF"

echo "→ Deploying Edge Functions..."
npx supabase functions deploy validate-lobby-code --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy generate-lobby-code --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy create-lobby --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy join-lobby --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy leave-lobby --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy get-lobby-players --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy start-song-selection --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy search-songs --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy get-recommended-songs --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy select-song --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy start-countdown --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy get-lobby-state --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy pause-playback --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy end-song --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy restart-game --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy submit-phrase-progress --project-ref "$SUPABASE_PROJECT_REF"

echo "→ Verifying create-lobby + join-lobby + leave-lobby + get-lobby-players..."
HOST_ID="$(node -e "console.log(crypto.randomUUID())")"
JOINER_ID="$(node -e "console.log(crypto.randomUUID())")"
CREATE_RESP="$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-lobby" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"player_id\":\"${HOST_ID}\",\"display_name\":\"Norman\"}")"
echo "$CREATE_RESP"
LOBBY_CODE="$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.code||'')" "$CREATE_RESP")"
HOST_TOKEN="$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.session_token||'')" "$CREATE_RESP")"
if [[ -n "$LOBBY_CODE" && -n "$HOST_TOKEN" ]]; then
  JOIN_RESP="$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/join-lobby" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"player_id\":\"${JOINER_ID}\",\"display_name\":\"Alex\",\"code\":\"${LOBBY_CODE}\"}")"
  echo "$JOIN_RESP"
  curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-lobby-players" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"player_id\":\"${HOST_ID}\",\"session_token\":\"${HOST_TOKEN}\"}"
  echo ""
  curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/leave-lobby" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"player_id\":\"${HOST_ID}\",\"session_token\":\"${HOST_TOKEN}\"}"
  echo ""
  curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-lobby" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"player_id\":\"${HOST_ID}\",\"display_name\":\"Norman\"}"
  echo ""
else
  echo "Verification skipped: create-lobby did not return code + session_token"
  exit 1
fi

echo ""
echo "Done. Hosted Supabase is ready."
