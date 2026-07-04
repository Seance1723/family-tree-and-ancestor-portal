# Firebase → MySQL Migration Plan

## Goal
Replace Firebase (Auth + Firestore) with a SQL-backed backend while preserving all existing app functionality.

## Strategy
- **Keep the frontend architecture** (React components, state management, IndexedDB offline layer) intact.
- **Introduce a backend REST API** in `server.ts` backed by MySQL.
- **Replace the data layer** (`src/services/firebase.ts` and `src/services/syncService.ts`) so the rest of the app continues calling the same functions.
- **Replace Firebase Auth** with email/password authentication using bcrypt + JWT. Google sign-in becomes optional/Phase 2.

## Steps
1. **Database Schema** — Create `mysql_schema.sql` with tables for users, members, documents, reminders, access requests, settings, subscriptions. ✅
2. **Backend Foundation** — Add MySQL connection, auth middleware, and error handling to `server.ts`. ✅
3. **Auth API** — Add `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` endpoints. ✅
4. **Data API** — Add CRUD endpoints for members, documents, reminders, access requests, settings, subscriptions. ✅
5. **Frontend Auth Service** — Replace `src/services/firebase.ts` with a local auth service that calls the backend. ✅
6. **Frontend Sync Service** — Rewrite `src/services/syncService.ts` to call REST endpoints instead of Firestore. ✅
7. **Update App.tsx** — Swap Firebase auth hooks for the new service and update Google login handler. ✅
8. **Update Direct Firestore Imports** — Adjust components that import Firestore directly (`SupportUs`, `SupportAndLegal`, `ContactUs`, `SuperAdminPanel`). ✅
9. **Offline Sync Preservation** — Ensure IndexedDB offline-first flow still works via the new sync service. ✅
10. **Verification** — Run TypeScript lint and test the dev server. ✅

## Notes
- Keep Firebase config file temporarily for reference; it will be removed once migration is verified.
- All sensitive data (contacts, birthdates) will continue to be encrypted client-side with the existing crypto utility before being sent to the backend.
- The backend will run via the existing `npm run dev` script (`tsx server.ts`).
