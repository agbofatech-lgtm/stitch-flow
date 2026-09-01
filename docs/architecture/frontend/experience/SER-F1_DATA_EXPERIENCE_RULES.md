# Data experience rules

Pretty UI must not conceal authority.

| SAC | UI must respect |
|---|---|
| SAC-1 | Finalize is explicit; artifacts append-only; no silent recompute |
| SAC-2 | AppContext remains UI SoT until a later named programme; T2 is mirror; no localStorage delete |
| SAC-3 | Authenticated `/shop` only; never remount unauthenticated `/customers` |
| SAC-4 | PostgreSQL is shop persistence when configured; platform stays file/memory |
| SAC-5 | Sync is opt-in session; default transport blocked; do not pretend remote ack |

## Frontend must never

- Enable `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` as a UX fix
- Show “synced” unless an ack exists
- Invent persistence
- Overwrite frozen trusted payloads
- Make intelligence/AI authoritative (ADR-004)
- Confuse shop invoices with SaaS billing
- Treat FeatureGate as commercial authority (ADR-006: UX_ONLY)

## Honesty in the atelier

If a room cannot load because the unmounted HTTP API 404s, the constitution prefers **AppContext-backed craft UI** or an honest “this room is not connected to shop authority yet” — **not** wiring the old CRUD. Wiring `/shop` screens is **SER-F14**, owner-authorized, not a drive-by in F5.

Current `SHOP_DATA_PRECEDENCE.remoteSync === 'blocked'` remains the product default.
