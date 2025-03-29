# Lucide React Import Fix

## Issue

The live-calls page was encountering an error with importing the `Refresh` icon from lucide-react:

```
Attempted import error: 'Refresh' is not exported from '__barrel_optimize__?names=PhoneCall,Refresh!=!lucide-react' (imported as 'Refresh').
```

This error occurs due to a combination of:
1. Next.js's barrel optimization for imports
2. The specific icon not being available in the version of lucide-react being used

## Fix Applied

We replaced the `Refresh` icon with the `RotateCw` icon, which is available in the current version of lucide-react:

```javascript
// Before:
import { PhoneCall, Refresh } from 'lucide-react';

// After:
import { PhoneCall, RotateCw } from 'lucide-react';
```

And updated all references to the Refresh component in the JSX:

```jsx
// Before:
<Refresh className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />

// After:
<RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
```

## Why This Works

The RotateCw icon provides visually similar functionality to what was intended with the Refresh icon. It shows a circular arrow that works well with the animation to indicate a refresh operation.

## Checking Available Icons

When working with lucide-react, you can check available icons in several ways:

1. Visit the official Lucide documentation at https://lucide.dev/icons/
2. Check the npm package contents
3. Look at the types defined in the package

If you encounter a similar issue with other icons, you can always:
1. Find an alternative icon with similar meaning
2. Upgrade lucide-react to a newer version if available
3. Import from a different icon library that has the specific icon you need

## Version Information

This fix was tested with:
- Next.js: 14.1.0
- lucide-react: 0.341.0

If you upgrade the lucide-react package in the future, the original `Refresh` icon might become available, and you could revert this change if desired.
