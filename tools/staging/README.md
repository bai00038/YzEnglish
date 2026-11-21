# Staging-only deployment

Use `npm run deploy:staging` from the repository root. It builds with `.env.staging`, checks the emitted API URL, and syncs **only** `oss://yz-english-site-staging/`. It has no bucket override and does not delete remote objects.

The static bucket must use public-read and the same static website configuration as production (index `index.html`, error document `index.html`). The member-data bucket remains private. Never place member records, API secrets or function environment files in the static build.

Before acceptance:

1. Publish the updated member API as a separate staging Function Compute function. Keep code validation and cookie sessions. Preserve existing `CODE_PEPPER` if sharing existing test membership codes; use host-only API cookies (`COOKIE_DOMAIN` unset) and `MEMBERSHIP_COOKIE_PREFIX=yz_member_staging` to isolate production sessions. Allow only `https://staging.learnyzenglish.com` and explicitly needed test origins.
2. Grant the runtime read/write permission to its private learning prefix. `MEMBERSHIP_DATA_PREFIX` controls code, device and learning prefixes together; preserve the existing prefix when using existing code records.
3. Bind `api-staging.learnyzenglish.com`, with HTTPS, to the staging function. `.env.staging` must match it.
4. Move **only** `staging.learnyzenglish.com` from its old `yz-english-site` binding to `yz-english-site-staging`; retain the staging certificate and update the staging DNS target if required. Do not remove the production domain binding or change production website settings.
5. Verify root and `/membership`, JS/CSS assets, API health, origin allowlist, redemption and persistent learning operations through HTTPS. The OSS error document may return HTTP 404 for SPA paths while serving the correct application, matching the existing production configuration.
6. Run §十五.8 with browsers A and B and the same test code. Production deployment remains blocked until the owner explicitly says acceptance passed.

Only the frontend is uploaded by `deploy:staging`; it does not deploy a function or switch domain bindings automatically.
