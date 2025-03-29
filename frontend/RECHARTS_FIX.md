# Recharts Compatibility Fix

## Issue

The frontend application was encountering a React Server Components (RSC) compatibility issue with the Recharts library, resulting in the following error:

```
Error: Super expression must either be null or a function
```

This error occurs because Recharts uses React class components internally, which are not compatible with React Server Components in Next.js 13+.

## Fix Applied

We fixed the issue by adding the `"use client"` directive to any component that uses Recharts. This directive tells Next.js to render these components only on the client side, avoiding server-side rendering (SSR) issues with class components.

### Modified Files:

- `src/components/calls-chart.tsx` - Added "use client" directive

The following files already had the "use client" directive and did not need modification:
- `src/components/conversation-quality-chart.tsx`
- `src/components/topic-distribution-chart.tsx`
- `src/components/conversation-volume-chart.tsx`
- `src/components/success-rate-chart.tsx`

## Why This Works

In Next.js App Router, all components are Server Components by default. Server Components cannot contain:
- React lifecycle methods
- React class components
- React hooks (useState, useEffect, etc.)
- Browser-only APIs

By adding the "use client" directive, we're explicitly telling Next.js to render these components on the client side, where all these features are available and compatible.

## Future Considerations

For future chart implementations in this project:

1. Always add the "use client" directive to any component that uses Recharts
2. Consider using a server-compatible charting library if server-side rendering is needed
3. Keep an eye on Recharts updates that might add better support for React Server Components

## References

- [Next.js Server Components documentation](https://nextjs.org/docs/getting-started/react-essentials#server-components)
- [Recharts GitHub issues related to Next.js compatibility](https://github.com/recharts/recharts/issues/3615)
