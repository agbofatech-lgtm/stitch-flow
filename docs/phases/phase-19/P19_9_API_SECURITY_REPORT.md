# P19.9 API Security

| Surface | Class |
|---|---|
| POST /auth/register, /login | PUBLIC |
| GET /auth/me | AUTHENTICATED |
| /platform/* (except webhooks) | TENANT-SCOPED |
| checkout/cancel | TENANT-OWNER |
| /platform/billing/webhooks/:adapter | signature (not JWT) |
| /control/* | PLATFORM-ADMIN |

Unauthenticated business CRUD remains unmounted.
