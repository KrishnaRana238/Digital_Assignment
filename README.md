# Good Lie Club

Good Lie Club is a split frontend/backend implementation of the golf charity subscription assignment.

- `front/`: Next.js 16 frontend with the landing page, auth, subscriber dashboard, admin dashboard, charities, draws, and pricing.
- `backend/`: Express + TypeScript API with JWT auth, draw logic, winner verification, Stripe billing hooks, SMTP email hooks, and dual persistence modes.

## What is implemented

- Black/red landing page with delayed auth prompt, login, signup, logout, and role-aware routing
- Subscription engine with monthly/yearly plans, Stripe checkout support, Stripe billing portal support, webhook sync, and local fallback when Stripe is not configured
- Last-5 Stableford score logic with automatic rolling replacement
- Monthly draw engine with random and algorithmic simulation modes
- Prize pool split for 5/4/3 matches with 5-match jackpot rollover
- Charity selection and independent donation recording
- Winner proof upload and admin verification / payout states
- Email hooks for signup, billing updates, draw publication, proof uploads, and winner review changes
- Supabase runtime persistence support with local JSON fallback for development
- Subscriber dashboard and full admin operations view
- Mobile-friendly, non-traditional golf UI

## Local Run

1. Frontend

```bash
cd front
cp .env.example .env.local
npm install
npm run dev
```

2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

3. Open the app

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

You can also use the root helper scripts:

```bash
npm run dev:front
npm run dev:back
```

## Demo Credentials

- Admin: `admin@goodlie.club` / `Admin123!`
- Subscriber: `alex@goodlie.club` / `Player123!`

## Environment

Backend `.env`:

- `PORT`
- `FRONTEND_URL`
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Frontend `.env.local`:

- `BACKEND_URL`

## Build Verification

These were run successfully:

```bash
cd backend && npm run build
cd front && npm run build
```

The backend was also smoke-tested with:

- `GET /api/health`
- `GET /api/public/overview`
- `POST /api/auth/login`
- `GET /api/me/dashboard`

## Deployment Notes

- Frontend is ready for Vercel deployment from the `front/` folder.
- Backend is ready to deploy separately as a Node service.
- Apply `backend/supabase/schema.sql` to a new Supabase project before enabling Supabase runtime persistence.
- When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the backend reads and writes Supabase tables instead of `backend/data/app-db.json`.
- When Stripe env vars are present, `/api/me/subscription/activate` creates a hosted checkout session instead of doing a local-only activation.
- Configure your Stripe webhook endpoint to send events to `POST /api/webhooks/stripe`.
- Local development falls back to JSON persistence and local activation when cloud integrations are not configured.

## Key Files

- Frontend entry: `front/src/app/page.tsx`
- Subscriber dashboard: `front/src/app/dashboard/page.tsx`
- Admin dashboard: `front/src/app/admin/page.tsx`
- Backend API: `backend/src/index.ts`
- Draw / business logic: `backend/src/services.ts`
- Stripe helpers: `backend/src/billing.ts`
- Email helpers: `backend/src/email.ts`
- Persistence layer: `backend/src/store.ts`
- Seed data: `backend/src/seed.ts`
- Supabase schema: `backend/supabase/schema.sql`
