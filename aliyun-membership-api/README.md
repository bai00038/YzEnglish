# Yz English 阿里云会员安全后端

This service is designed for Alibaba Cloud Function Compute. It keeps membership-code validation and OSS signing out of the browser.

## Endpoints

- `GET /health`
- `POST /v1/membership/redeem` with `{ "code": "..." }`
- `GET /v1/membership/status`
- `POST /v1/membership/logout`
- `POST /v1/content/sign` with `{ "sceneId": "FD-01-001", "objectKey": "content/FD-01-001/FD-01-001-no-subtitles.mp4" }`

Successful redemption sets an HttpOnly session cookie. At most two browser sessions are active at once by default. An inactive slot is released after 15 minutes, while the signed browser credential rolls forward for 30 days whenever the member returns. The browser never receives the membership-code hash list or an OSS credential.

## Safety boundary

- `MEMBERSHIP_REPOSITORY=memory` is for local tests only.
- Production fails closed unless both OSS buckets and RAM credentials are configured.
- Signed objects must stay below `content/<SCENE_ID>/` and use an allowed extension.
- Membership codes and device records live in a separate private bucket (`MEMBERSHIP_OSS_BUCKET`). They must never share the public content bucket.
- The OSS bucket remains public until staging is fully verified. Make it private only during the final cutover.

## Local test

```bash
cp .env.example .env.local
npm test
npm start
```

The local server does not load `.env.local` automatically. Export the variables in your shell or use the Function Compute configuration panel.

## Production records

Membership records live in the separate private `yz-english-membership` bucket under:

- `_private/membership/codes/<code-hash>.json`
- `_private/membership/devices/<code-hash>/<device-hash>.json`

The provisioning script uploads only keyed hashes. Plaintext codes must be delivered to the buyer and never stored in the frontend repository. The publishing manifest never references `_private/` objects.

## Member learning data (§十五)

- `GET /v1/learning` returns `{learningId, data: {progress, learned, mistakes}, migrated}`.
- `POST /v1/learning` accepts one validated operation: `progress`, `learn`, `unlearn`, `addMistake`, `removeMistake`, or the first-device `merge`.
- Both endpoints use the existing cookie session, validity check and exact origin allowlist. No code/hash or identity parameter is accepted from the caller. `learningId` is an opaque keyed cache namespace, not an authentication credential.
- Progress stores only `{percent, updatedAt}` per scene. Learned marks are entry IDs. Mistakes store `{entryId, source, sceneId, addedAt}`; repeated IDs update the timestamp instead of adding a row.
- The private bucket stores the three data categories as a change log at `_private/membership/learning/<code-hash>.jsonl`. `AppendObject` byte positions serialize concurrent device changes; conflicts re-read and retry. Device migration metadata prevents a retry from resurrecting a removed entry. No raw code, answer text, registration data or personal information is stored.
- The first merge chooses newer progress timestamps and unions learned/mistake IDs. Normal writes are single-item operations, so refresh never unions stale caches back over cloud removals.
- Browser caches and pending offline changes are scoped to `learningId`; legacy anonymous records and detailed lesson resume data stay local. Reconnect, returning to the tab, and bounded retries resume synchronization.
- Runtime RAM policy needs `oss:GetObject` and `oss:PutObject` on the new private learning prefix (`AppendObject` uses `oss:PutObject`). Keep that bucket private.

Run `npm run learning:test` from the frontend root for client/server synchronization tests.

### Staging isolation

Before uploading, check actual domain bindings. On 2026-11-20 both `learnyzenglish.com` and `staging.learnyzenglish.com` were bound to **the same** `yz-english-site` bucket. Deploying to that bucket would change production. The intended isolated bucket is `yz-english-site-staging`; move only the staging domain binding/DNS and mirror the website hosting configuration there. Never sync to `yz-english-site` during staging acceptance.

Use a separate staging Function Compute function and `api-staging.learnyzenglish.com`. Preserve existing membership validation and code hashing; staging uses the existing membership code records and private learning store; use a dedicated test code for acceptance. Use host-only staging API cookies (`COOKIE_DOMAIN` unset, `MEMBERSHIP_COOKIE_PREFIX=yz_member_staging`) to avoid replacing production sessions. Do not update the production function or its route before acceptance.
