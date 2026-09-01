# P19.8 Identity / Tenancy Persistence

File snapshot includes identities (password **hashes**), tenants, workspaces, memberships, operators.

JWT still `{ sub, typ }` only. Tenant ≠ Workspace preserved.

Unique email enforced in application. Unique tenant slug via generated suffix.
