# StitchFlow Backend

Production-ready Express + TypeScript + PostgreSQL backend for StitchFlow.

## Requirements
- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (for queues)
- npm

## Local Setup
1. Copy environment file:
   ```
   cp .env.example .env
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start PostgreSQL and Redis:
   ```
   docker-compose up postgres redis -d
   ```

4. Run migrations:
   ```
   psql $DATABASE_URL -f migrations/001_init_extensions.sql
   psql $DATABASE_URL -f migrations/002_create_core_tables.sql
   psql $DATABASE_URL -f migrations/003_create_sync_tables.sql
   psql $DATABASE_URL -f migrations/004_create_indexes.sql
   psql $DATABASE_URL -f migrations/005_seed_admin.sql
   ```

5. Start development server:
   ```
   npm run dev
   ```

## Production Build
```
npm run build
npm start
```

## Render Deployment
- Create PostgreSQL instance on Render
- Create Redis instance if using BullMQ in production
- Add environment variables from .env.example
- Set build command: npm install && npm run build
- Set start command: npm start
