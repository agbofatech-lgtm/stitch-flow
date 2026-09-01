# P10 — Protected Assets Register

| Asset | Class | Evidence |
|---|---|---|
| `DesignStudio.tsx` | **PROTECTED** | Hash `5059c0db…`; P16–P19 firewall |
| `patternEngine.ts` | **PROTECTED** | Hash `d02000d6…` |
| `productionAssistant.ts` | **PROTECTED** | Hash `140a646d…` |
| `shared/types/index.ts` | **PROTECTED** | Hash `424ef618…` |
| Production stage service (backend) | **PROTECTED** | Historical |
| MeasurementVersion / garment domain | **PROTECTED** | P13–P15 |
| FeatureGate commercial meaning | **NOT UI-rewrite as law** | UX_ONLY |
| Experience tokens/primitives | **TRANSITIONAL** | P18; safe to extend |
| StudioShell | **TRANSITIONAL** | Hosts Studio; do not import engines |
| Layout.tsx | **REPLACEABLE** | Unused by App |
| SplashScreen | **TRANSITIONAL** | Premium seed |
| CRUD screens | **REPLACEABLE presentation** | Keep data wiring |
| Control Center UI | **ABSENT** | May be created later as distinct plane |
| brand.ts | **TRANSITIONAL** | Identity source, not tailoring |

Do not assume old-looking = replaceable. DesignStudio looks dated in places and remains protected.
