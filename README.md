# Spice Express

A logistics operations portal with a React/Vite frontend and a Node/Express backend connected directly to the client's Microsoft SQL Server database.

## Current Runtime Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: Microsoft SQL Server, database `CMSDB_21052026`
- Auth: JWT tokens backed by `dbo.USER_MANAGEMENT`
- Legacy source tables include `ACCOUNT_MST`, `ORDER_HEADER`, `ORDER_DELIVERY`, `INVOICE_HEADER`, `INVOICE_DETAIL`, and related customer/rate tables.

## Local Development

Start SQL Server first and make sure `CMSDB_21052026` is restored or created from the client SQL script.

Backend environment goes in `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=local-dev-secret

MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=CMSDB_21052026
MSSQL_USER=spice_api
MSSQL_PASSWORD=your-password
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true
```

Run the backend:

```bash
cd backend
npm install
npm run db:check
npm run dev
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

## Deployment Notes

The frontend can be hosted on Vercel or another static frontend host.

The backend should run as a persistent Node service where it can reach SQL Server over a secure network path. For client handover, that usually means one of:

- backend deployed near the client SQL Server
- VPN/private tunnel to the SQL Server
- strict SQL Server IP allowlist for the backend host

Do not import the client SQL Server database into a separate production database. SQL Server is the source of truth.

## Useful Commands

```bash
# backend
npm run db:check
npm run dev
npm run build

# frontend
npm run dev
npm run build
```
