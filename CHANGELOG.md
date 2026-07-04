# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- MySQL-backed REST API in `server.ts` replacing Firebase Auth and Firestore.
- `mysql_schema.sql` with tables for users, family members, documents, reminders, access requests, system settings, subscriptions, contact messages, and donations.
- JWT authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- CRUD endpoints for members, documents, reminders, access requests, settings, and subscriptions.
- Admin dashboard endpoints for messages, members, subscriptions, and donations.
- Contact form and donation recording endpoints.
- `CHANGELOG.md` to track project changes.

### Changed
- Rewrote `src/services/firebase.ts` to use the backend REST API instead of Firebase SDK while keeping the same export signatures for compatibility.
- Rewrote `src/services/syncService.ts` to call REST endpoints and preserve the IndexedDB offline-first flow.
- Updated `App.tsx` to use the new auth service and adjusted the Google login handler to show a message.
- Updated `ContactUs`, `SupportAndLegal`, `SupportUs`, and `SuperAdminPanel` to use the new backend API instead of direct Firestore calls.
- Updated UI text references from Firebase/Firestore to SQL backend.
- Added MySQL and JWT environment variables to `.env.example`.
- Expanded `.gitignore` to exclude IDE settings, cache directories, graphify output, and legacy Firebase artifacts.

### Removed
- `firebase-applet-config.json` and `firebase-blueprint.json` configuration files after migration verification.

### Fixed
- Fixed login/signup not advancing past the landing page by adding an auth observer pattern so `onAuthStateChanged` listeners are notified after sign-in, sign-up, and sign-out.

## [0.0.0] - 2026-07-04

### Added
- Initial project setup with Firebase integration.
- Family tree visualization and member management.
- Offline-first IndexedDB storage.
- Razorpay payment integration.
- Super admin panel and contact/support forms.

---

*Note: Update this file with each notable change. Place new entries under the `[Unreleased]` section.*
