# StitchFlow API v1

## Health
GET /api/v1/health

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Auth
### POST /api/v1/auth/register
```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "fullName": "Jane Doe",
  "tier": "pro"
}
```

### POST /api/v1/auth/login
```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

### POST /api/v1/auth/refresh
```json
{
  "refreshToken": "..."
}
```

## License Validation
### POST /api/v1/licenses/validate
```json
{
  "licenseKey": "STITCH-XXXX-XXXX-XXXX",
  "deviceFingerprint": "fp_xxx"
}
```

## Sync Push
### POST /api/v1/sync/push
Authorization: Bearer <token>

## Sync Pull
### GET /api/v1/sync/pull?since=2026-03-18T12:00:00.000Z&tables=orders,customers

## Events
### POST /api/v1/events
Authorization: Bearer <token>

## Feature Requests
### POST /api/v1/feature-requests
### POST /api/v1/feature-requests/:id/vote

## Admin
### GET /api/v1/admin/users
### GET /api/v1/admin/analytics
### GET /api/v1/admin/licenses
### PATCH /api/v1/admin/licenses/:id
### POST /api/v1/admin/licenses/:id/revoke
### GET /api/v1/admin/feature-requests
### GET /api/v1/admin/audit-logs
