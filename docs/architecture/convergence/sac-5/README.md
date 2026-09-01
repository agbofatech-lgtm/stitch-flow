# SAC-5 — Offline synchronization & authority handoff

Selected `/shop` domains (customers, orders, measurement snapshots, production transitions, trusted artifacts) can move from T2 outbox to authenticated PostgreSQL through `POST /shop/sync/operations` and `GET /shop/sync/changes`.

AppContext/localStorage remains product UI SoT. SAC-2 projections are not auto-pushed. 3D and Phase 20 remain locked.

Start: [`00_BASELINE.md`](./00_BASELINE.md)  
Forensics: [`01_SYNC_FORENSIC_MAP.md`](./01_SYNC_FORENSIC_MAP.md)  
Protocol: [`02_PROTOCOL.md`](./02_PROTOCOL.md)  
Certification: [`SAC5_FINAL_CERTIFICATION.md`](./SAC5_FINAL_CERTIFICATION.md)
