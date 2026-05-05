# Alokit Admin Frontend

Separate admin frontend for the shared Alokit backend.

## Local Development

Backend:

```bash
npm run dev
```

This starts the backend on:

```text
http://localhost:5000
```

Admin frontend:

```bash
cd admin-frontend
npm run dev
```

This starts the admin frontend on:

```text
http://localhost:3001
```

Why:

- backend stays on `5000`
- admin frontend runs on `3001`
- admin frontend proxies API requests to the backend through `/backend-proxy`

## Environment

Use a local env file:

```text
admin-frontend/.env.local
```

You can copy it from:

```text
admin-frontend/.env.local.example
```

Local defaults:

```env
NEXT_PUBLIC_API_URL=/backend-proxy/api/v1
NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:5000
BACKEND_ORIGIN=http://localhost:5000
```

Production values:

```env
NEXT_PUBLIC_API_URL=https://api.alokit.co/api/v1
NEXT_PUBLIC_BACKEND_ORIGIN=https://api.alokit.co
BACKEND_ORIGIN=https://api.alokit.co
```
