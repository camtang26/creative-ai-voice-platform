# React Hooks Usage Fixes

This document outlines the issues fixed related to React hooks usage in the ElevenLabs Calling Dashboard.

## Fix: Incorrect Hook Usage in ActiveCallCard

**Issue:** In the `ActiveCallCard` component, there was an incorrect usage of the `useState` hook where a `useEffect` hook should have been used:

```jsx
// Incorrect code - using useState for side effects
useState(() => {
  const timer = setInterval(() => {
    // Update timer logic
  }, 1000);

  return () => clearInterval(timer);
});
```

**Solution:** Changed the hook to `useEffect` with the appropriate dependency array:

```jsx
// Corrected code - using useEffect for side effects
useEffect(() => {
  const timer = setInterval(() => {
    // Update timer logic
  }, 1000);

  return () => clearInterval(timer);
}, [call.startTime]);
```

**Files modified:**
- `src/components/active-call-card.tsx`

## Understanding React Hooks Rules

React hooks come with some important rules:

1. **Only Call Hooks at the Top Level**
   - Don't call hooks inside loops, conditions, or nested functions

2. **Only Call Hooks from React Functions**
   - Call hooks from React function components or custom hooks, not regular JavaScript functions

3. **Use the Right Hooks for the Right Purpose**
   - `useState`: For managing state
   - `useEffect`: For side effects (like timers, data fetching, subscriptions)
   - `useContext`: For consuming context values
   - `useRef`: For mutable refs that don't trigger re-renders
   - `useCallback`: For memoizing callbacks
   - `useMemo`: For memoizing computed values

4. **Include Proper Dependencies**
   - Always list all dependencies that your effect uses
   - Missing dependencies can lead to stale closures and bugs

## Common Hook Mistakes

1. **Missing dependencies in the useEffect dependency array**
   - Causes effects to run with stale data

2. **Using the wrong hook for the job**
   - Like using useState where useEffect is needed

3. **Forgetting to clean up in useEffect**
   - Can cause memory leaks for subscriptions, timers, etc.

4. **Excessive re-rendering due to object literals in dependencies**
   - Use useMemo/useCallback to stabilize object references

5. **Ignoring the exhaustive-deps ESLint rule**
   - This rule helps ensure your useEffect dependencies are correctly specified
