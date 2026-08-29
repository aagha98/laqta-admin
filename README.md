# LAQTA Admin

Three services, orchestrated with `docker-compose`:

- **`backend/`** — a standalone Node.js/Express REST API. This is what the LAQTA mobile
  app talks to, and it's also what the admin frontend talks to. Owns all MongoDB access.
- **`frontend/`** — a Next.js admin dashboard. Renders UI only; every piece of data comes
  from calling the backend over HTTP. It also acts as a thin BFF (backend-for-frontend)
  for the admin login: it proxies credentials to the backend, then holds the resulting
  JWT in its own httpOnly cookie so the browser never sees the token directly.
- **`mongo`** — official `mongo:7` image, its own volume.

```
┌──────────┐      ┌───────────┐      ┌─────────┐
│ frontend │─────▶│  backend  │─────▶│  mongo  │
│ (Next.js)│      │ (Express) │      │         │
└──────────┘      └───────────┘      └─────────┘
                        ▲
                        │
                  mobile app (Flutter)
```

## Why split, and what changed

This used to be one Next.js app doing both jobs (simpler to run, one process). Splitting
it means the backend can be scaled, deployed, or replaced independently of the admin UI,
and the API surface is now unambiguous — the mobile app and the admin frontend are just
two different clients of the same backend, with no special-casing between them.

The tradeoff: the frontend can no longer query MongoDB directly from its server
components. Every dashboard page now calls the backend's API instead
(`frontend/lib/apiClient.js`), and pages that need live client-side interactivity
(`requests/page.js`) go through thin proxy routes in `frontend/app/api/admin/*` — the
browser never talks to the backend directly, since the admin's session token lives in an
httpOnly cookie the browser's JS can't read anyway.

## Data model

Unchanged from before — see `backend/src/models/`:

- **User** — mirrors the Flutter app's `UserProfile`.
- **Request** — mirrors the Flutter app's `SavedRequest`, with a `status` that drives the
  pipeline (`submitted` → `underReview` → `matched` → `completed`, or `cancelled`).
- **AdminUser** — email + bcrypt hash for dashboard logins.

## Backend API (for the mobile app)

Base URL: the `backend` service, port `4000`.

| Method | Path                  | Auth          | Purpose                              |
|--------|-----------------------|---------------|---------------------------------------|
| POST   | `/api/auth/otp/request` | none        | Mock-send an OTP to a Saudi number     |
| POST   | `/api/auth/otp/verify`  | none        | Verify code, creates the user if new, returns `{ token, user }` |
| GET    | `/api/users/me`         | Bearer token | Get the signed-in user's profile      |
| PUT    | `/api/users/me`         | Bearer token | Update profile fields                 |
| GET    | `/api/requests`         | Bearer token | List the signed-in user's requests    |
| POST   | `/api/requests`         | Bearer token | Create a request                      |
| DELETE | `/api/requests/:id`     | Bearer token | Cancel a request (sets status, keeps history) |

Admin-only endpoints (`Authorization: Bearer <admin token>`, obtained from
`POST /api/auth/admin/login`): `GET /api/admin/requests/stats`,
`GET /api/admin/requests`, `PATCH /api/admin/requests/:id`,
`DELETE /api/admin/requests/:id`, `GET /api/admin/users`.

OTP sending/verification is still mocked (any 6-digit code is accepted) — wire up a real
SMS provider in `backend/src/routes/otp.js` before shipping. The mobile app itself still
uses local `shared_preferences`, not this API — pointing `RequestsController` /
`ProfileController` at these endpoints is the natural next step.

## Run locally without Docker

Needs a MongoDB instance reachable at `MONGODB_URI` (local `mongod`, or Atlas).

```bash
# backend
cd backend
cp .env.example .env.local   # if you make one; or just export the vars
npm install
npm run dev    # or: npm start

# frontend, in a second terminal
cd frontend
npm install
BACKEND_URL=http://localhost:4000 npm run dev
```

## Run everything with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- Frontend (admin dashboard): `http://localhost:3000`
- Backend (API, also what the mobile app points at): `http://localhost:4000`
- MongoDB data persists in the `laqta-mongo-data` volume across restarts/rebuilds.

Change `ADMIN_PASSWORD` in `.env` from the default — the backend re-hashes and updates it
on every startup if it differs from what's stored.
