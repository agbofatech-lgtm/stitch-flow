# Environment checklist

Copy `.env.example` → `.env`. Never commit `.env`.

| Name | Required for laptop UI | Notes |
|---|---|---|
| `NODE_ENV` | no | default development |
| `PORT` | yes for backend | `5000` |
| `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` | no | default `false` — business CRUD unmounted |
| `PLATFORM_DATA_PATH` | no | empty = in-memory IAM; set path for file JSON TRANSITIONAL |
| `DATABASE_URL` | no for atelier UI | Postgres **NOT VERIFIED** |
| `JWT_SECRET` | yes for Control Center login | placeholder in example |
| `REFRESH_TOKEN_SECRET` | yes for auth | placeholder |
| `ACCESS_TOKEN_EXPIRES_IN` | no | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | no | `7d` |
| `CORS_ORIGIN` | no | API currently `origin: true` |
| `MAX_PAYLOAD_SIZE` | no | |
| `BCRYPT_ROUNDS` | no | |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed/docs only | not a live production admin claim |
| `FREE_DEVICE_LIMIT` etc. | unused by PEX | |
| `REDIS_URL` | no for UI | |
| `RENDER_EXTERNAL_URL` | no | legacy Render docs |
| `BILLING_WEBHOOK_SECRET` | only webhook HMAC tests | not a PSP key |
| `VITE_API_BASE_URL` | if API not on localhost:5000 | baked in at **vite build** time |
| `VITE_API_URL` | unused by `api.ts` (name exists in some files) | prefer `VITE_API_BASE_URL` |

Do **not** set OpenAI / Gemini / Claude keys for this verification. Live LLM is **NOT YET VERIFIED**. Local intelligence is heuristic / `local-governed`.
