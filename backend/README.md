# Spice Express Backend

Node/Express API for the Spice Express portal. The runtime database is the client's Microsoft SQL Server database, `CMSDB_21052026`.

## Required Environment

```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=change-this
FRONTEND_URL=https://your-frontend-domain

MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=CMSDB_21052026
MSSQL_USER=spice_api
MSSQL_PASSWORD=change-this
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true
```

For SQL Server Express with a named instance, either expose a fixed TCP port and use `MSSQL_PORT`, or omit `MSSQL_PORT` and set:

```bash
MSSQL_INSTANCE=SQLEXPRESS
```

## Commands

```bash
npm install
npm run db:check
npm run dev
npm run build
```

## API Endpoints

- `GET /health`
- `POST /api/auth/login`
- `GET /api/lr/track/:id`
- `GET /api/customers`
- `GET /api/lr`
- `GET /api/invoice`
- `GET /api/mis/summary/:customerId`
- `GET /api/v1/analytics/comparison`

All endpoints except health, login, and public tracking require a bearer token.
