# P19.6 Audit Model

`commercialAudit` rows: tenantId, actorId, eventId, source, previousState, newState, timestamp.

Sources: checkout, webhook, cancel, access (denials), control-center.

No secrets. GET `/control/audit` is platform-operator only.
