# 2026-11-20 staging handoff status

- Initial local changes committed and pushed: `64fa220`, branch `codex/visual-refresh`.
- §十五 implemented and tested. Build and sync completed to the new standalone public-read bucket `yz-english-site-staging` (Singapore). Static website index/error document mirror the current production settings.
- Real private OSS test passed: concurrent AppendObject updates preserve both writes; unauthenticated access is 403. Temporary verification object removed.
- Production bucket `yz-english-site` received **no sync or object uploads** in this task. Read-only domain/website checks showed both production and staging domains were bound to it.
- Still pending: staging API Function Compute deployment, `api-staging.learnyzenglish.com` DNS/HTTPS routing, staging website domain/certificate binding migration to its standalone bucket, then end-to-end HTTPS verification.
- Blocker: current OSS credentials are denied `fc:ListFunctions`; Chrome's Aliyun console session expired and is at the login page. Waiting for owner login. No new access keys requested or created.
- Prepared function artifact: `/private/tmp/yz-membership-api-staging.zip` (rebuild from `aliyun-membership-api/src`, dependencies and package files if source changes). It contains no environment secrets.
- Do not tell the owner staging is ready until both the staging website and API work through their final HTTPS domains. Do not deploy production before the owner explicitly passes §十五.8.
