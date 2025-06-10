# Decision Log

This file records architectural and implementation decisions using a list format.
2025-05-12 16:41:54 - Log of updates made.

*

## Decision

*

## Rationale 

*

## Implementation Details

*
---
[2025-05-13 12:27:55] - **Decision:** Downgrade `@fastify/helmet` for backend deployment.
    - **Rationale:** Render deployment logs showed `FST_ERR_PLUGIN_VERSION_MISMATCH` because the installed `@fastify/helmet` (`^13.0.1`) required Fastify v5.x, while the project uses Fastify `^4.29.0`.
    - **Action:** Downgraded `@fastify/helmet` to `^11.1.1`, a version known to be compatible with Fastify v4.x.
    - **Outcome:** Resolved the server startup error on Render.

[2025-05-13 12:27:55] - **Decision:** Implement Suspense boundaries for dynamic Next.js pages.
    - **Rationale:** Frontend build failed during static generation for pages using `useSearchParams` (`/campaigns/bulk-add`, `/campaigns/real-time-monitor`) without a Suspense boundary.
    - **Action:** Wrapped the client-side components of these pages in `<Suspense>` with a loading skeleton.
    - **Outcome:** Resolved the `useSearchParams() should be wrapped in a suspense boundary` build error.

[2025-05-13 12:27:55] - **Decision:** Dynamically import form component for Next.js page.
    - **Rationale:** Frontend build failed during static generation for `/reports/new` page with a `TypeError` related to `react-hook-form` context (`Cannot destructure property 'getFieldState'`).
    - **Action:** Refactored the page to dynamically import the main form component with SSR disabled (`ssr: false`).
    - **Outcome:** Resolved the prerendering error for the `/reports/new` page.