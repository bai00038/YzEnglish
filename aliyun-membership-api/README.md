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
