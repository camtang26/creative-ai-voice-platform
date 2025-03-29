# Next.js App Router Compatibility Fixes

This document outlines the issues fixed related to Next.js App Router compatibility in the ElevenLabs Calling Dashboard.

## Fix 1: Recharts Compatibility with Server Components

**Issue:** Recharts library uses React class components which are incompatible with Next.js Server Components, causing the error:
```
Error: Super expression must either be null or a function
```

**Solution:** Added "use client" directive to chart components to make them Client Components.

**Files modified:**
- `src/components/calls-chart.tsx`

## Fix 2: Client Hooks in Server Components

**Issue:** Using client-side hooks like `usePathname` in a Server Component, causing the error:
```
Error: usePathname only works in Client Components. Add the "use client" directive at the top of the file to use it.
```

**Solution:** Added "use client" directive to the sidebar component.

**Files modified:**
- `src/components/sidebar.tsx`

## Understanding Server vs Client Components in Next.js

In Next.js App Router (Next.js 13+), all components are Server Components by default. This means they:

- Run only on the server
- Have access to server resources (databases, filesystem, etc.)
- Cannot use browser APIs or React hooks
- Cannot use state or other interactive features

To mark a component as a Client Component, add the "use client" directive at the top of the file. Client Components:

- Run both on the server (for initial render) and on the client
- Can use React hooks (useState, useEffect, useContext, etc.)
- Can use browser APIs
- Can be interactive with state and event handlers

### When to use "use client"?

Add "use client" to any component that:
1. Uses React hooks (useState, useEffect, useRef, useContext, etc.)
2. Uses browser APIs (window, document, localStorage, etc.)
3. Relies on event handlers (onClick, onChange, etc.)
4. Uses external libraries that rely on client-side features
5. Needs to be interactive

### Best Practices

1. Keep as many components as Server Components when possible for better performance
2. Add "use client" only to components that need interactivity
3. Split components into server and client parts when appropriate
4. Place "use client" as the first line of the file, before any imports
