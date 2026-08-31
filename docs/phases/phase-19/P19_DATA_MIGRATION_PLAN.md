# P19 Data Migration Plan

Status: **NO MIGRATION AUTHORIZED**.

P19.1 does not migrate AppContext, T2, SQL, mock tiers, or shop payments.

| Source | Risk if casually migrated |
|---|---|
| AppContext / localStorage | T10 C1 TRANSITIONAL live SoT |
| T2 `user` / `workspace` / `invoice` / `payment` | Shop + identity buckets ≠ SaaS |
| mockData tiers | Not commercial law |
| Shop Invoice/Payment | Must not become SaaS invoices |
| Empty `002_create_core_tables.sql` | Not a schema |
| FeatureGate / dual price tables | Conflicting; OD-P19-02/03 first |

Before any future migration: source/destination authority, duplicates, tenant ownership, compatibility, plan, rollback, idempotency. Historical financial records must not be silently reinterpreted.
