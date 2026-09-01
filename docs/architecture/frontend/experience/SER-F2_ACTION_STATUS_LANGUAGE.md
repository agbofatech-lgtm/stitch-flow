# SER-F2 action and status language

Buttons: primary / secondary / ghost / danger. Floor primary: **Open client room**.

Confidence states: local, queued, syncing, synced, offline, pending, draft, finalized, verified, error, blocked.

Default floor/status: **Local workspace**. Never “synced” while SAC-5 default transport is blocked. Queued only if outbox count > 0.
