# P19.8+P19.9 Risk Register

| ID | Risk | Mitigation |
|---|---|---|
| P-R1 | File store is not Postgres | Classified; 006 not applied |
| P-R2 | Password hashes on disk | file mode  not claimed as KMS |
| P-R3 | PLATFORM_DATA_PATH unset → memory | documented |
| P-R4 | Applying 006 onto empty 002 | do not auto-migrate |
| P-R5 | FeatureGate still UX | config UX_ONLY |
