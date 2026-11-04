# Staging deployment checklist

Do not change the production OSS ACL until every staging check passes.

## 1. Function Compute

- Region: Singapore, matching the existing OSS bucket.
- Runtime: Node.js 20 or current supported Node.js runtime.
- HTTP trigger: HTTPS only.
- Environment: copy `.env.example`, use unique 32+ byte secrets.
- Repository mode: `MEMBERSHIP_REPOSITORY=oss`.
- Attach the least-privilege RAM role described by `ram-runtime-policy.json`.
- Allowed origin initially: `https://staging.learnyzenglish.com` only.

## 2. DNS and browser boundary

- Bind `api-staging.learnyzenglish.com` to Function Compute.
- Enable HTTPS.
- Do not use a wildcard CORS origin.
- Keep cookies HttpOnly, Secure, and SameSite=Lax.

## 3. Staging tests

- Invalid code is rejected.
- Valid code works on the first and second device.
- A third device is rejected.
- Disabled and expired codes are rejected.
- Reloading keeps the session.
- A member video plays and its URL expires.
- A non-member cannot obtain a signed URL.
- Free lessons still play without a code.
- Mobile Safari, WeChat browser, and desktop Chrome all pass.

## 4. Production cutover

1. Back up the bucket ACL and current manifest.
2. Rotate all legacy frontend membership codes.
3. Deploy the frontend with `VITE_MEMBERSHIP_API_URL=https://api.learnyzenglish.com`.
4. Verify production redemption while the content bucket is still public.
5. Make only member video/PDF objects private (or make the bucket private after public covers/free content have a separate delivery path).
6. Verify all free and member lessons again.
7. Enable billing and traffic alerts.

## Rollback

- Restore the previous frontend build.
- Restore the saved OSS ACL only if member playback is broken.
- Never expose `_private/membership/` through the public manifest or CDN.
