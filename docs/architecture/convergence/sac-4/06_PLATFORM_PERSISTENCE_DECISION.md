# Platform persistence decision

**PLATFORM: Postgres authority = NO**

Reason: P19 remains conditionally certified on the file/memory store. `006_platform_commercial.sql` is unapplied historical SQL. SAC-4 must not create a second identity/membership SoT.

File/memory fallback for **platform** remains the production path (`PLATFORM_DATA_PATH` or in-memory when unset).

Deferred: platform identities, tenants, memberships, workspaces, commercial billing tables, invoices, materials, reports, dashboard, payments.

Adapter-ready: **NO** (not required this stage). Shop and platform stay separate persistence boundaries.
