# P19.2+P19.3 Migration Compatibility

**No destructive migration.**

| Existing | Classification | Action this slice |
|---|---|---|
| AppContext `workspaceId` / mock workspace | TRANSITIONAL | Unchanged. Not mapped to Tenant. |
| localStorage session keys | TRANSITIONAL | Unchanged. Not security. |
| Mock `User` | LEGACY seed | Unchanged. |
| FeatureGate / tiers | TRANSITIONAL commercial UI | Unchanged (not entitlement runtime). |
| Shop Invoice/Payment | Operational domain | Unchanged. |
| Empty SQL migrations / `initDb` shop tables | STUB / shop | Not used for IAM. |
| New platform IAM store | TRANSITIONAL in-memory | Bootstrap on register only. |

Adapter pattern (future): Legacy Workspace → Tenant + Default Workspace. **Not executed.** Rollback: delete platform module; product UI unaffected.

Duplicate authority remains until Owner authorizes product wiring (P19.9). Classified, not silently merged.
