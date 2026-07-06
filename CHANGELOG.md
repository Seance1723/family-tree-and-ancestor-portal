# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Added **Password Recovery Module**: Fully featured, non-simulated Forgot/Reset Password flow. Employs a secure 6-digit cryptographic verification reset token saved in the database with a 15-minute expiration window. Includes input validation, developer sandbox token alerts, and state modal views on the landing page card.
- Added **Two-Factor Authentication (2FA/MFA) Module**: Premium session-login MFA module. Toggles Two-Factor Authentication via the User Dashboard Profile drawer setting. When enabled, logins (email/password or Google) issue a 6-digit security code to the user's email, rendering an MFA Authorization dialog block with developer sandbox code displays.
- Added **Google OAuth Client ID Configurator**: Enabled administrators to set their custom Google OAuth 2.0 client credential ID in System Settings. If configured, the app loads official Google Identity Services (GSI) widgets; if empty, it falls back to a descriptive warning to configure it in the .env file.
- Integrated **Kinly Brand Logo SVG**: Replaced generic icons across Landing Page, User Dashboard sidebars, Mobile Headers, and Administrative portals with the official custom vector logo `Kinly_Logo_V.svg`.
- Integrated **Billing & Invoices Module** inside the `UserDashboard` (includes sidebar toggle button, mobile drawer integration, and a spacious payments ledger).
- Client-side **PDF Invoice Generator** using `jsPDF` to export official payment vouchers containing metadata, billing details, and transactional items.
- Restricted **Admin Diagnostics** column inside the billing ledger table, visible only if the logged-in user is an administrator (`user.isAdmin`). Displays Razorpay unique transaction ID, payment source, and App Name ("Family Tree").
- Added support for transaction history arrays inside the user's encrypted subscription data (`history` sub-attributes in `user_subscriptions` JSON column).
- Integrated **Google Login Connector Modal** capturing Google profile attributes (`displayName`, `email`, `dob`, `gender`) with developer simulations for verification testing.
- Added **Automated Family Member Linkage Engine**: Matches newly registered user email against `family_members.contact_email` across all databases, auto-assigns node associations, and renders top invitation banners letting users sync profile details.
- Enforced mutual exclusion between **Support / Donation Channel** and **Premium Upgrade Funnel** toggles: enabling one disables the other, but they can be disabled together. Fixed state validation during load and save operations to ensure invalid DB records are automatically corrected.
- Built administrative configurator for **Free Tier Capacity** slot limit, **Monthly Price (INR)**, and **Yearly Price (INR)** package tiers.
- Integrated **Coupons & Discount Code Module** inside the upgrade modal and administrator portal. Admins can create active percentage discounts with set expiration timelines. Customers can apply codes at checkout with automatic free bypass for 100% discounts.
- Dedicated client-authenticated `GET /api/donations` API endpoint to allow users to load their personal contribution history.
- Complete SaaS-style full-screen layout redesign for `SuperAdminPanel.tsx` (persistent dark sidebar navigation on the left, top operations header bar on the right, and fluid spacious scroll container for tab contents).
- Interactive sidebar options containing a branding header, active/hover page links, open tickets counter badges, switch view controls, and a custom logout callback handler.
- Admin statistics endpoint `/api/admin/stats` to aggregate metadata (counts and privacy distribution).
- Database health check diagnostic endpoint `/api/admin/db-health`.
- Recent activity log endpoint `/api/admin/activity` showing registrations, nodes added, and payments.
- Real-time diagnostic report tables and recent activity feed in `SuperAdminPanel.tsx`.
- Support for `name` field in `contact_messages` database schema and API endpoints.
- Auto-exit to user view in `SuperAdminPanel.tsx` if a `403 Forbidden` error is returned by the admin APIs (preventing unauthorized UI rendering).
- Admin member count limit bypass in `UserDashboard.tsx` (`checkLimitBeforeAdd`).
- A distinct, custom `🛡️ Admin (Unlimited)` status badge in the `UserDashboard` sidebar for Administrator accounts.

### Removed
- Completely deleted the mock `src/services/firebase.ts` module and all simulated Firestore API stubs (`doc`, `getDoc`, `setDoc`, `getDocs`, etc.).

### Fixed
- Re-routed all component imports from `services/firebase` to `services/auth` with clean, native, type-safe API helper function calls.
- Fixed admin detection bug caused by strict `=== 1` comparison on MySQL BOOLEAN (TINYINT) fields.
- `mysql_schema.sql` with tables for users, family members, documents, reminders, access requests, system settings, subscriptions, contact messages, and donations.
- JWT authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- CRUD endpoints for members, documents, reminders, access requests, settings, and subscriptions.
- Admin dashboard endpoints for messages, members, subscriptions, and donations.
- Contact form and donation recording endpoints.
- `CHANGELOG.md` to track project changes.
- Users management REST endpoints: `/api/admin/users`, `/api/admin/users/:id/admin`, `/api/admin/users/:id/status` in `server.ts`.
- Structured folders: `src/components/users/` for user features and `src/components/admin/` for admin features.
- Dedicated `UserDashboard.tsx` component encapsulating all family tree visualization, document management, matching, and syncing logic.
- Expanded `SuperAdminPanel.tsx` with dedicated management tabs: User Accounts (with search, role toggling, activation/deactivation toggling), Support Messages, Genealogy Nodes moderation, Billing & Subscriptions/Donations Ledgers, and Maintenance settings.

### Changed
- Rewrote `src/services/firebase.ts` to use the backend REST API instead of Firebase SDK while keeping the same export signatures for compatibility.
- Rewrote `src/services/syncService.ts` to call REST endpoints and preserve the IndexedDB offline-first flow.
- Updated `App.tsx` to use the new auth service and adjusted the Google login handler to show a message.
- Updated `ContactUs`, `SupportAndLegal`, `SupportUs`, and `SuperAdminPanel` to use the new backend API instead of direct Firestore calls.
- Updated UI text references from Firebase/Firestore to SQL backend.
- Added MySQL and JWT environment variables to `.env.example`.
- Expanded `.gitignore` to exclude IDE settings, cache directories, graphify output, and legacy Firebase artifacts.
- Refactored `App.tsx` into a lightweight authentication and route orchestrator shell rendering `LandingPage`, `SuperAdminPanel`, or `UserDashboard` depending on session and mode.
- Restructured all user subcomponents (`AncestralMatcher`, `AnniversaryReminders`, `DocumentManager`, `FamilyInsights`, `FamilyTreeRenderer`) to compile relative imports correctly within `src/components/users/`.
- Enforced user account deactivation validation on login, signup, and session check, returning `403 Forbidden` for deactivated accounts.

### Removed
- `firebase-applet-config.json` and `firebase-blueprint.json` configuration files after migration verification.

### Fixed
- Fixed login/signup not advancing past the landing page by adding an auth observer pattern so `onAuthStateChanged` listeners are notified after sign-in, sign-up, and sign-out.
- Resolved compilation issues regarding missing imports in extracted components.

## [0.0.0] - 2026-07-04

### Added
- Initial project setup with Firebase integration.
- Family tree visualization and member management.
- Offline-first IndexedDB storage.
- Razorpay payment integration.
- Super admin panel and contact/support forms.

---

*Note: Update this file with each notable change. Place new entries under the `[Unreleased]` section.*
