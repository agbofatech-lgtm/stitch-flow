# Verification commands (actual)

Run from repository root unless noted.

## Git

```bash
git status
git rev-parse HEAD
git log --oneline -15
```

## Protected hashes (must match)

```bash
sha256sum apps/web/src/components/DesignStudio.tsx \
  apps/web/src/modules/services/patternEngine.ts \
  apps/web/src/modules/services/productionAssistant.ts \
  apps/web/src/shared/types/index.ts
```

Expected:

- DesignStudio `5059c0db5633d9340793e620863cfc521ee8118a2f3188ead9082ee2c1ae783b`
- patternEngine `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc`
- productionAssistant `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4`
- types `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9`

## Install / build

```bash
npm install
npm run build
```

Backend TypeScript (this workspace **passes**):

```bash
npm --workspace=apps/backend run lint
```

Web TypeScript (inherited FAIL — do not relabel):

```bash
npm --workspace=apps/web run type-check
```

Known fail files: `apps/web/src/shared/api/materials.ts`, `apps/web/src/shared/api/reports.ts`, `apps/web/src/types.ts`.

## Tests — web

There is no single `npm test` at repo root that runs every suite. Run:

```bash
npm --workspace=apps/web run test:experience
npm --workspace=apps/web run test:studio
npm --workspace=apps/web run test:workflow
npm --workspace=apps/web run test:golden-path
npm --workspace=apps/web run test:execution
npm --workspace=apps/web run test:design
npm --workspace=apps/web run test:tailoring
npm --workspace=apps/web run test:domain
npm --workspace=apps/web run test:intelligence
npm --workspace=apps/web run test:persistence
npm --workspace=apps/web run test:deterministic
```

`tsx` is provided via the backend workspace (hoisted). Always `npm install` at **root**.

## Tests — backend

```bash
npm --workspace=apps/backend test
# equivalent:
npm run test:backend
```

Jest is scoped to `*.p19.test.ts` (5 suites). Empty historical suites are not the P19 matrix.

## Health

With backend running:

```bash
curl -s http://localhost:5000/health
curl -s http://localhost:5000/ready
```
