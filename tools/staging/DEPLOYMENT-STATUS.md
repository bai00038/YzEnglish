> 当前状态（2026-11-21）：staging 网站/API 已配置完成，§十六及后续界面反馈已部署；等待用户验收，未授权正式发布。接管请先读根目录 `HANDOFF.md` 与 `AGENTS.md`。以下早期阻塞记录仅为历史。

# 2026-11-20 staging handoff status

- Initial local changes committed and pushed: `64fa220`, branch `codex/visual-refresh`.
- §十五 implemented and tested. Build and sync completed to the new standalone public-read bucket `yz-english-site-staging` (Singapore). Static website index/error document mirror the current production settings.
- Real private OSS test passed: concurrent AppendObject updates preserve both writes; unauthenticated access is 403. Temporary verification object removed.
- Production bucket `yz-english-site` received **no sync or object uploads** in this task. Read-only domain/website checks showed both production and staging domains were bound to it.
- Still pending: staging API Function Compute deployment, `api-staging.learnyzenglish.com` DNS/HTTPS routing, staging website domain/certificate binding migration to its standalone bucket, then end-to-end HTTPS verification.
- Blocker: current OSS credentials are denied `fc:ListFunctions`; Chrome's Aliyun console session expired and is at the login page. Waiting for owner login. No new access keys requested or created.
- Prepared function artifact: `/private/tmp/yz-membership-api-staging.zip` (rebuild from `aliyun-membership-api/src`, dependencies and package files if source changes). It contains no environment secrets.
- Do not tell the owner staging is ready until both the staging website and API work through their final HTTPS domains. Do not deploy production before the owner explicitly passes §十五.8.

## Follow-up after owner login and authorization

- Owner logged in, explicitly approved restricted local export/reuse of the production function configuration, and explicitly approved a dedicated staging runtime role with narrowly scoped private member/content access.
- Export copied to `/private/tmp/yz-staging-private/production-export.yaml`; folder is mode 0700 and files mode 0600. Staging environment JSON/env files are in that same folder and must never be printed, committed or uploaded to the public website bucket.
- Existing production function is custom Debian 12 / Node.js 22, startup `npm run start`, port 9000, role `YzEnglishMembershipFunctionRole`. Existing runtime policy has no learning-prefix access. Do not modify that production role.
- Prepared cloud creation form for `yz-english-membership-api-staging`, zero minimum instances, uploaded `/private/tmp/yz-membership-api-staging.zip`, set startup/port, and pasted staging environment into its JSON editor. The old role is still selected there; **replace it with the dedicated staging role before creating the function**.
- Proposed dedicated policy: `YzEnglishMembershipStagingRuntimePolicy`; proposed role: `YzEnglishMembershipStagingFunctionRole`, trust service `fc.aliyuncs.com`. The nonsecret policy JSON is tracked as `aliyun-membership-api/ram-staging-runtime-policy.json`.
- Policy/role creation attempts triggered Aliyun account verification. Owner completed verification, but browser control then began timing out. Their existence is **not verified**; inspect before retrying to avoid duplicates.
- Chrome tab ids at interruption: FC form `1522551580`, RAM role creation `1522552423`, production policy read-only `1522552426`, OSS console `1522552420`.
- CUA browser id `3` (Chrome/Bing). All browser and native Chrome entry points began timing out, even after session resets. Owner asked to reconnect the ChatGPT browser extension. Do not infer cloud creation success from a click or verification alone.
- No production deployment, no production role mutation, and no production bucket sync was performed.

## 2026-11-21 §十六

- Owner manually completed staging function, website/API domain and HTTPS setup. Read-only checks now return website 200 and API `/health` 200. No further RAM, DNS or function changes are part of §十六.
- §十六 reorganizes existing progress/learned/mistakes only; adds client-local message read IDs, runtime announcement JSON, and local membership-expiry reminders.
- Staging announcement URL is `/announcements.json` in its own bucket. Staging sync excludes this runtime file and only initializes it if absent, preserving later editorial updates. Production announcement channel is not written by staging deployment.
- Validation: 6 overview/message tests, 3 member client tests, 12 API tests, 29 kit regression tests passed. Browser fixture on a separate localhost port verified 3 unfinished + 8 completed, shared notebook removals, learned recovery, unread dots, desktop layout and 375×667 (scene block bottom 581px, bottom nav starts 591px). Temporary fixture removed before deployment.
- Deployment completed to `oss://yz-english-site-staging/`. Public HTML, JS `index-BQGTxyQt.js` and CSS `index-ws14iby8.css` byte-match the build; announcement JSON is 200/empty; API health is 200. Chrome displays the new overview with the existing member's own data.
- Fixed staging-only SPA fallback HTTP status from 404 to 200, preserving all other website configuration. Prior XML backup is `/private/tmp/yz-staging-website-before-section16.xml`. No production objects, roles, DNS, API configuration or announcements were changed.
- Awaiting owner's §十六 acceptance. Do not deploy production.
- Owner's follow-up visual reference applied: membership card now has one white header row with checked “会员已开通”, right-aligned ISO expiry date, inset divider, and the existing masked code / eye / copy / change row below. Removed the three detail tiles and switched mask characters to bullets.
- Final reference-card build: JS `index-CFrMmZlA.js`, CSS `index-VwZS1tX9.css`; masked-code regression adds 5 passing tests (55 total). All six `/membership` routes now return 200. Browser verified the final card on staging at 375×667; full scene block remains above bottom navigation. Expiry retains browser-local calendar date, displayed as YYYY-MM-DD.

## Follow-up UI consistency

- Added reusable `LearningEmptyState` with coordinated SVG variants for continuing/completed scenes, vocabulary, learned entries and messages. No sample learning records are created.
- Moved shared card, example audio/source pager, carousel/navigation and root page layout into `src/app/components/KitEntryCard.tsx`; library and vocabulary notebook both call these components.
- Per owner clarification, removed learned controls/filtering only from the library; kept My Learning's learned page and stored data. Moved the collection action to the card bottom in one 28px row, renamed to “加入单词本”.
- Added `PageHeading` and shared sans-serif title scale/kicker layout; library, My Learning, home sections and relevant learning/list pages call the shared component.
- Documented component-first conventions in repository `AGENTS.md`. Existing kit/message/masked-code checks: 40 passed. Build passed; staging-only sync, production remains untouched.
- Final component build: `index-DvvB4yS9.js` / `index-CsEWCHSv.css`. Browser confirmed no learned controls in Kit, 28px single-row notebook action, shared vocabulary review layout, illustrated empty completed page at mobile/desktop sizes, and My Learning's learned entry retained. At 375×667, scene block ends at 561px and bottom nav begins at 591px.

- Follow-up correction: restored original scene-row layout. Overview now uses shared `ContinueLearningSection`: initial 3 unfinished scenes, “查看更多” reveals 3 more per click, fully expanded list can collapse. Top-right link opens completed scenes with its real count; no longer links to a separate all-in-progress page. Existing list route remains available.
- Verified on staging: initial 3 rows → 查看更多 → 6 rows → 收起 → 3 rows; “已学完 0 集” opens the completed page. Build and staging sync succeeded (`index-CSRxZL02.js`, `index-BlQ9QIHd.css`). No production writes.

## Notebook learned workflow

- Owner approved notebook → learned → restore-to-notebook workflow. Shared `NotebookEntryActions` is used by review cards and full lists; My Learning counts use the same derived notebook selector. Library still has no learned controls.
- Reuses existing API operations and all three persisted collections. Keeps original mistake provenance while learned; no backend deployment or schema change. Legacy learned-only entries restore as manual; dictation errors/re-adding reopen a learned word.
- 17 member-client/API checks passed, including new two-browser, reload, offline restore, original metadata preservation, legacy recovery and dictation reopening coverage. A separate localhost port with temporary data verified card/list counts and both restore paths at 375×667. No real member records were changed during testing; temporary fixture removed.
- Staging deployment completed: `index-DmaSF6oH.js`, `index-CjsqQQ32.css`. Browser confirmed shared notebook actions on staging at 375×667. API runtime and production website were not deployed.

## Scene return context

- My Learning continue/review links now carry the fixed `from=membership` marker; explicit top return, breadcrumb, desktop/mobile active navigation, adjacent/related lesson links, and end-of-collection return all share `scene-navigation.ts`. Normal direct/library links still return to Explore. Source survives refresh and next/previous navigation; arbitrary return URLs are ignored.
- 10 UI/navigation/message tests and staging build passed. No API/data-model changes. Production remains untouched.
- Final owner clarification: remove/cancel-collection controls are removed from BOTH Kit/popovers and the personal notebook. Kit only adds/shows added state; notebook card/list only mark learned; Learned page restores to notebook. Existing stored records and backwards-compatible API operations are retained.
- Browser verified continue → next episode → refresh → return to My Learning; direct course entry still shows Explore/category breadcrumb and returns to Explore.
- Final staging build `index-CmPBT9ZQ.js` / `index-CnvnSPz1.css`. Browser verified notebook card/list each only expose learned, no remove buttons; Kit shows disabled added state. Origin-aware return, next episode and refresh checks passed. Only staging static bucket synced; production untouched.

## Personal word list grid

- Extracted existing Kit tile grid into `KitEntryList.tsx`; the library, notebook full list and learned list call the same component and responsive CSS. Personal grids omit pronunciation buttons, source labels and extra row styling.
- Owner confirmed notebook retains “已学会”; learned page uses “+ 恢复” to return entries to notebook. Existing learning state transitions are unchanged.
- Build passed; separate local preview verified 3 desktop columns and 1 mobile column with no overflow/nested buttons. Temporary preview removed before deployment.
- Staging deployment `index-DeyNbgG9.js` / `index-DyTbKOHv.css` completed. Live notebook full list has a 3-column desktop grid, no audio or source labels, and learned actions; original Kit tile still opens its review card. Local 6-tile fixture verified mobile 1-column layout and + 恢复 rendering. No real learning data changed by these layout checks; production untouched.

## Shared view headers

- Extracted `PageSectionHeader.tsx` and its view-independent CSS. Kit and learning pages share return link, PageHeading, description, action slot and filter/view-control slots. Notebook now uses the same root layout in both modes instead of conditional wrapper/header classes.
- `section-page` explicitly preserves top insets across card/list; removed notebook-specific card header typography overrides. Card viewport/body behavior remains shared with Kit. Build passed.
- Final shared-header staging build: `index-CjVM3lbU.js` / `index-ZTVMgeTO.css`. Browser compared return/title/description/controls bounding boxes, font sizes/weights/colors across modes: identical for notebook and Kit at 1440×900 and 375×667. Mobile card navigation ends at 583px before nav starts 591px, no horizontal overflow. Production untouched.

- View names standardized to 卡片 / 列表 via shared `ViewModeSwitch.tsx`. Notebook tabs use 列表 · N; collection-scope 全部 remains unchanged. Staging `index-DOBliGZJ.js` build/sync passed. Browser verified Kit card→174-item list→card and notebook card→3-item list. Production untouched.
