# StitchFlow API v1

## Health
GET /api/v1/health

Response:
{
  "status": "ok",
  "timestamp": "2026-03-18T12:00:00.000Z",
  "version": "1.0.0"
}

## Auth
### POST /api/v1/auth/register
### POST /api/v1/auth/login
### POST /api/v1/auth/refresh

## License Validation
### POST /api/v1/licenses/validate

## Sync
### POST /api/v1/sync/push
### GET /api/v1/sync/pull

## Events
### POST /api/v1/events

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
