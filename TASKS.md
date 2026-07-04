# Features & Technical Specification Docs

This file documents all features implemented within the **Kinly** platform in detail, detailing the engineering choices, cryptography model, state synchronization, and reactive UI elements.

---

## 🧭 Core Feature Directory

### 1. Zero-Knowledge Cryptographic Vault
- **Concept:** Traditional family trees are a goldmine for identity theft (mother's maiden name, birthdates, locations). Kinly uses a zero-knowledge architecture.
- **Implementation:** 
  - Names, birth years, relationship flags, anecdotes, and media titles are translated via a local symmetric cipher prior to cloud storage.
  - The secret cryptographic translation sequence is derived from the user's authentic credential hash.
  - Raw credentials are never transmitted; Firebase Authentication manages the secure gatekeeping while the local context derives decryption variables.
  - Database items stored on Firestore appear purely as complex cipher streams (e.g., `U2FsdGVkX19H...`).

### 2. Full-Screen Interactive Sandbox Tree
- **Concept:** Demonstrates the cryptographic pipeline on the landing page in a sandbox format prior to registration.
- **Implementation:**
  - Standard pre-defined lineage nodes float subtly in an abstract background.
  - Floating paths utilize `motion.line` dynamic line paths drawing vectors between related nodes.
  - Floating avatars utilize **Dicebear Personas SVG** dynamic templates rather than robotic placeholders, ensuring a warm, elegant visual feel.
  - Clicking a node triggers a live decrypt simulation: text converts from a scrambled cipher string to human-readable anecdote strings with a character-by-character digital sweep animation.

### 3. Real-Time Offline-to-Cloud Sync Engine
- **Concept:** Enables user interaction during travels, in historical museums, or in remote countryside cemeteries where connectivity is spotty.
- **Implementation:**
  - Built-in network connection listeners detect connection state drops.
  - Changes are stored locally inside a client-side database mirror instantly.
  - A persistent transaction log tracks updates made offline.
  - When connection is re-established, changes sync in batches using cloud update rules, complete with user-visible synchronization indicators.

### 4. Anonymized Kinship Matcher (LinMatch Protocol)
- **Concept:** Locates shared branches across the global platform without leaking raw names or specific logs.
- **Implementation:**
  - Calculates non-identifying hashes of birth years, birth location indices, and parent-child sequence structures.
  - Queries for overlaps in anonymous match logs across the Firebase cluster.
  - Displays match probabilities (e.g. `98.6% Shared Lineage`) to indicate potential long-lost relatives.
  - Prompts a secure key-exchange handshake sequence if both users agree to mutually decrypt their branches for connection.

### 5. Document & Memoir Vault
- **Concept:** Safe-keeps digitized journals, passport scans, birth certificates, and physical letters.
- **Implementation:**
  - Local client-side compression reduces large scans to optimized binary objects.
  - Cryptographic wrappers seal these payloads before safe storage.
  - Supports PDF generation and custom high-fidelity printing.
  - **Dynamic Report Toggles:** Enhances report generation by providing modular print-options, allowing users to toggle specific content sections (e.g., Contacts, Family Network, and Notes/Anecdotes) live on-screen before generating the physical printout or PDF.

### 6. Reactive UI Notifications & Custom Modals
- **Concept:** Eliminates standard alerts/confirms that break browser sandbox iframe environments, delivering a premium look and feel.
- **Implementation:**
  - **Custom Confirmation Modals:** Intercepts delete and signout requests. Renders custom Framer Motion cards with blur backgrounds (`backdrop-blur-xs`), smooth exit scales, and clear affirmative buttons.
  - **Fading Success Toasts:** Triggers a brief, auto-fading notification showing "Notes saved successfully" upon modifying ancestral journals inside `#textarea-edit-notes`. Integrates smooth sliding entrances and exits.

### 7. Decorative Portrait Frames & Orientation Correction
- **Concept:** Presents ancestral profile portraits in a traditional museum-style mount and allows live correction of orientation offsets.
- **Implementation:**
  - Framed within a multi-layered decorative card featuring premium gradients, double-borders (`border-double border-4`), and distinct metallic corner ornaments.
  - A fallback **Custom SVG Family Tree** icon is rendered beautifully when no user photo exists.
  - Integrates a responsive `Rotate` action button (with `RotateCw` icon) inside the portrait area, executing a native 90° progressive transform rotation on the image.

### 8. Direct Lineage Breadcrumbs (Lineage Pathfinding)
- **Concept:** Enables rapid, one-click hopping between generations, displaying the immediate path between the root ancestor ("Self") and the currently selected member.
- **Implementation:**
  - Performs a dynamic Breadth-First Search (BFS) graph-traversal across parent, child, and sibling relationships to determine the direct lineage trajectory.
  - Renders a lightweight, high-contrast, text-based navigation row above the profile header with custom separator hashes and click-nav triggers.

### 9. Ancestral Life Span & Status Badges
- **Concept:** Displays the total earthly lifespan for deceased relatives while clearly differentiating living and deceased members at a glance.
- **Implementation:**
  - Detects if a member has a recorded "death" anniversary/reminder.
  - **Life Span String Calculator:** Computes and pairs birth years and death years dynamically (e.g., `1920 - 2005 (at death: 85)`).
  - **Distinct Color Badges:** living members display an optimistic Blue border badge, while deceased relatives are rendered in a quiet, respectful Slate border badge.

---

## 🛠️ Tech Stack & Key Integrations

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 18+ with TypeScript | High-performance state-driven component tree |
| **Build Engine** | Vite | Ultra-fast local compilation & bundling |
| **Animation** | Framer Motion (`motion/react`) | Fluid physical node drifts, fade transitions, and layout transformations |
| **Styles** | Tailwind CSS | Utility-first responsive design & premium slate-colored palette |
| **Icons** | Lucide React | Modern vector glyphs |
| **Cloud Persistence**| Google Cloud Firestore | Secure, distributed document store |
| **Auth Gateway** | Firebase Auth | Authenticates user vaults with credentials or Google OAuth |
| **Storage Mirror** | IndexedDB / LocalStorage | Handles local-first persistent caching during network blackouts |
| **Avatars** | Dicebear Personas API | Renders elegant, high-contrast human vector avatars |
