# STITCHFLOW — PHASE 8 PHYSICAL LAPTOP VALIDATION — EXACT WINDOWS COMMANDS

**Prepared:** 2026-08-28 · **Authoritative remote HEAD:** `93328e6` · Branch `arena/01a0466d-stitch-flow`
**Important:** Do NOT increase the Jest timeout (`testTimeout` is `60000` in `apps/backend/jest.config.js`). Do NOT skip/weaken tests. Do NOT modify production source. Do NOT rewrite history or force-push.

---

## 0. Prerequisites on the laptop

- Install **Node.js v22.x** (matches sandbox `v22.22.3`) and **npm 10.x**.
- Install **Git for Windows**.
- Ensure a POSIX-ish shell is available for the hard-timeout wrapper (Git Bash, or PowerShell with the `Start-Job` wrapper below). The repository test scripts themselves are cross-platform; only the *external hard timeout* wrapper needs a shell.
- Port **5541** must be free (embedded PostgreSQL test instance binds it) — close any app using it if needed.
- The test DB is **embedded PostgreSQL** (`embedded-postgres` package) — it boots automatically per Jest run; **no Docker/separate Postgres required**.

---

## 1. Clone / align the authoritative branch

Run in a clean directory (PowerShell):

```powershell
git clone https://github.com/agbofatech-lgtm/stitch-flow.git
cd stitch-flow
git fetch --all --tags
git checkout arena/01a0466d-stitch-flow
git rev-parse HEAD        # MUST print 93328e639811dba118fef5e19de51ec7945d674b
```

**If you already have the repo on the laptop**, instead align safely (never force-reset over unknown work):

```powershell
git fetch --all --tags
git status --short        # STOP if not clean / has untracked user work
git rev-parse HEAD        # if this is already 93328e6..., you're aligned; stop here
git merge --ff-only origin/arena/01a0466d-stitch-flow   # only fast-forward, never --hard
git rev-parse HEAD        # MUST now print 93328e6...
```

**Verify tags:**

```powershell
git ls-remote --tags origin | findstr phase-8
# expect: phase-8-developer-api -> 57541e4..., phase-8-webhooks -> 4f452ad..., phase-8-pre-work -> 8e4941b...
git tag | findstr phase-8
```

---

## 2. Install dependencies (lockfile)

```powershell
npm ci
```

Do **not** run `npm install` or edit `package.json`/`package-lock.json`. After install:

```powershell
git status --short   # expect: clean (empty)
```

---

## 3. Webhook suite FIRST, independently, with a hard external timeout

Do NOT run the full suite yet. The webhook suite must finish on its own.

### PowerShell hard-timeout wrapper (180 s cap — do not extend)

```powershell
$job = Start-Job -ScriptBlock {
  Set-Location "$PWD\apps\backend"
  npx jest tests/phase8-webhooks.test.ts --runInBand --detectOpenHandles
}
if (Wait-Job $job -Timeout 180) { Receive-Job $job; Remove-Job $job -Force }
else {
  Write-Host "HANG/OVERTIME: webhook suite did not finish within 180s."
  Stop-Job $job; Receive-Job $job; Remove-Job $job -Force
  # DO NOT increase the timeout. Go to hang forensics below.
}
```

**Expected:** `Test Suites: 1 passed · Tests: 22 passed` — completes well under 180 s (sandbox: 7.37 s). The 13 previously-leaked `TCPSERVERWRAP` handles are fixed in `43f7eda`; with `--detectOpenHandles` you should see **no** `TCPSERVERWRAP` after teardown.

### What the 22 webhook tests cover (map to your §requirements)

signature scheme (HMAC t/v1, tamper reject, replay/stale reject) · SSRF policy (prod reject + test-mode allow) · endpoint lifecycle (fail-closed flag, one-time `whsec_` secret, never stored plaintext, malformed rejections, edit/disable/delete, tenant isolation, JWT-only auth) · delivery pipeline over a real local HTTP receiver (delivery+signature, event filtering, idempotent double-dispatch, 5xx exponential-backoff retry→success, dead-letter on attempt exhaustion, permanent 4xx→immediate dead-letter, receiver timeout→transient, dead-letter replay as new attempt, test-event via real pipeline, per-tenant delivery isolation).

> `DELIVERING`-stale recovery and `FOR UPDATE SKIP LOCKED` concurrent claiming are implemented in `src/services/webhookService.ts` (`drainOnce` stale-`DELIVERING` clause + `FOR UPDATE SKIP LOCKED`). They are exercised by the suite's drain/retry paths; if you want to assert them explicitly on the laptop you can add a *temporary, uncommitted* test (see Hang Forensics note) — do not commit test changes.

---

## 4. Hang forensics (ONLY if the webhook suite hangs)

If the suite exceeds the 180 s cap:

```powershell
# Find which test hangs (test-name filter). Example real names:
cd apps\backend
npx jest tests/phase8-webhooks.test.ts --runInBand --detectOpenHandles -t "retries transient"
```

Give each individual test ~60 s. Likely culprits to inspect: unclosed `http.Server` (`TCPSERVERWRAP`), unawaited promise, open socket, `AbortController`, leaked pg pool client, embedded PG. The previous root cause (receiver servers not closed) is already fixed in `43f7eda`. If you hit a hang, capture the `--detectOpenHandles` output and STOP — do not increase `testTimeout`.

---

## 5. Full laptop regression battery (run in order)

Run each command from the repository root or the workspace dir as indicated. Record the output.

| # | Gate | Command | Expected |
|---|---|---|---|
| A | Webhook suite | (Step 3 wrapper) | 22/22 pass |
| B | Full backend Jest | `cd apps\backend; npx jest --runInBand` | 23 suites / 256 tests pass (~133 s sandbox) |
| C | Backend TypeScript | `cd apps\backend; npx tsc --noEmit` | exit 0, 0 errors |
| D | Backend production build | `cd apps\backend; npm run build` | exit 0 (`tsc -p tsconfig.json`) |
| E | Frontend TypeScript | `cd apps\web; npx tsc --noEmit` | exit 0, 0 errors |
| F | Frontend tests | `cd apps\web; npm test` (`vitest run`) | 5 files / 41 tests pass (~2.3 s sandbox) |
| G | Frontend lint | `cd apps\web; npm run lint` | **16 errors — ALL pre-existing Phase-1, 0 new** (see §8) |
| H | Frontend production build | `cd apps\web; npx vite build` | exit 0, ~8 s, PWA generated |
| I | Secret scan | see §7 | CLEAN |
| J | Protected-IP zero-diff | see §6 | ZERO DIFF |
| K | Backup/restore (incl. webhook) | see §9 | PASS |

> Full backend under a hard timeout too, to be safe:
> ```powershell
> $job = Start-Job -ScriptBlock { Set-Location "$PWD\apps\backend"; npx jest --runInBand }
> if (Wait-Job $job -Timeout 300) { Receive-Job $job; Remove-Job $job -Force } else { Stop-Job $job; Receive-Job $job; Remove-Job $job -Force; Write-Host "OVERTIME" }
> ```

---

## 6. Protected-IP zero-diff verification

```powershell
git diff phase-7-complete -- apps/web/src/components/DesignStudio.tsx apps/web/src/modules/services/patternEngine.ts apps/web/src/modules/services/productionAssistant.ts
```

Expected: **no output** (0 lines). Any diff = STOP.

---

## 7. Secret scan

```powershell
git grep -nEi "\bsk-[A-Za-z0-9]{20,}|\bghp_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}|\bxox[baprs]-" -- ":!**/*.test.ts" ":!**/*.test.js" ":!**/*.bak*" ":!docs/**" ":!*.md" ":!*.example"
git ls-files | findstr /i ".env"        # expect only: .env.example, apps/backend/.env.example
```

Expected: no high-entropy credential matches; only `.env.example` files tracked (both clean). `whsec_` / `sf_live_` appear only as source constants/comments/migration comments — not real secrets.

---

## 8. Known pre-existing lint findings (do NOT "fix")

The 16 frontend lint errors are inherited, **not** Phase 8 defects:
- `apps/web/src/components/DesignStudio.tsx` — 11 errors (protected IP — must remain untouched)
- `apps/web/src/modules/services/jobSheetExport.ts` — 5 errors (untouched)

Phase 8 files contribute **0** lint errors. Record these as pre-existing; do not modify protected code to remove them.

---

## 9. Backup/restore verification (incl. webhook tables)

The existing `apps/backend/tests/backup-restore.test.ts` runs inside the full Jest suite (Gate B) and covers customers/orders/invoices/financials/sync. To independently verify **webhook endpoints, delivery history, encrypted secrets, API keys, tenant isolation**, run a real drill: seed a webhook endpoint + encrypted `whsec_` secret + deliveries + API key in a source DB, `db-backup.js`, `db-restore.js` into a second fresh DB, then verify via a second connection that:

- `webhook_endpoints`, `webhook_deliveries`, `api_keys`, `usage_events`, `integration_outbox` row counts match;
- delivery statuses (`DELIVERED`/`DEAD_LETTER`) preserved;
- `secret_encrypted` is **byte-identical after restore** and **still decrypts** to the original secret (no plaintext ever on disk).

A temporary (uncommitted) drill harness can be used on the laptop; the sandbox equivalent already passed (endpoints 1, deliveries 2 [DELIVERED+DEAD_LETTER], api key 1, usage 1, tenant boundary true, envelope byte-identical, still decrypts, no plaintext in backup). Commands:

```powershell
cd apps\backend
$env:DATABASE_URL="postgresql://postgres:password@127.0.0.1:5541/stitchflow_test"
node scripts/db-backup.js C:\temp\sf-backup
# (after creating a second migrated DB) 
node scripts/db-restore.js C:\temp\sf-backup
```

---

## 10. Final git integrity before any completion tag

```powershell
git rev-parse HEAD
git ls-remote --heads origin arena/01a0466d-stitch-flow   # must equal local HEAD (93328e6...)
git status --short                                         # must be clean
git tag | findstr phase-8                                  # tags intact
git diff phase-7-complete -- apps/web/src/components/DesignStudio.tsx apps/web/src/modules/services/patternEngine.ts apps/web/src/modules/services/productionAssistant.ts
tasklist | findstr /i "postgres node jest"                 # no leaked processes
```

---

## 11. What to record & report back

Record exact numbers for: suites, tests, pass/fail, execution time, build result, lint result, secret-scan result, protected-IP result, backup/restore result, plus OS/CPU/RAM/Node/npm/Git versions. Then report the `PHASE 8 — LAPTOP VALIDATION REPORT`.

**Certification:** Only if the complete laptop battery passes with local==remote, clean tree, tags intact, protected IP ZERO DIFF, all tests pass, no leaked processes, no real secrets, may the final `phase-8-complete`-style checkpoint be proposed. Do **not** begin Phase 9–12.
