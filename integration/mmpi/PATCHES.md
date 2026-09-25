# Small edits in Repo123

## `src/router.ts`

In `AppRoute` union add:

`| { page: 'sso' }`

In `parseRoute`:

`if (path === '/sso') return { page: 'sso' };`

## `src/App.tsx`

Import `SsoConsumePage`. Before AuthGate, after public info pages:

```
if (route.page === 'sso') return <SsoConsumePage />;
```

Do not wrap this in AuthGate. After consume succeeds the app navigates to `/` and AuthGate hydrates the session.

## `supabase/config.toml`

```
[functions.sso-consume]
verify_jwt = false
```

## `src/env.d.ts`

No new VITE secrets.

## `tests/router.test.ts`

Add: `assert.deepEqual(parseRoute('/sso'), { page: 'sso' });`

## `scripts/diagnose-supabase.mjs`

Append `'20260925100000'` to `EXPECTED_MIGRATIONS`.
