# Yz English 网站接管说明

更新日期：2026-11-21（America/Toronto）。先读本文件和 `AGENTS.md`，再继续修改。

## 仓库与当前状态

- GitHub：`https://github.com/bai00038/YzEnglish.git`
- 工作分支：`codex/visual-refresh`。本轮功能在这个分支，未合并到 main。
- 本机站点目录：`/Users/bingbai/Library/CloudStorage/OneDrive-Personal/00Bingo/English/Yz-English/.site-visual-refresh`。
- 当前目录是 worktree，Git 元数据在另一个本机目录；编辑站点请进入上述目录。
- 本轮 §十六及其后续界面反馈已实现并部署到 staging，等待用户验收/后续反馈。
- **用户尚未授权正式发布；不要向 `yz-english-site` 同步任何文件。**
- staging：`https://staging.learnyzenglish.com`；API：`https://api-staging.learnyzenglish.com`。
- staging 的域名、HTTPS、独立 API 等由用户手动配置完成。本轮已经验证网站/API 可用，不要重新创建角色或函数。

## 用户已经确认的最终行为

1. 我的学习：参考图式的精简白色会员卡（开通状态、到期日、掩码兑换码、显示/复制/更换）；继续学习默认 3 集，底部查看更多每次再展开 3 集，全部展开后可收起；右上角已学完 X 集可点击。
2. 生词本：卡片和列表两种模式，卡片复用锦囊库，列表复用同款网格。两种模式头部的位置、字体、说明、按钮、筛选区完全一致。
3. 生词本只保留已学会，不提供移除。标记后从待复习生词本隐藏并进入已学会；已学会页的“+ 恢复”会回到生词本。
4. 云端仍只有 progress / learned / mistakes 三类数据，API 不变。已学会条目保留原收录元数据，以便恢复原 source / sceneId / addedAt；所有生词本视图/计数使用 notebookEntries 派生列表。旧 learned-only 条目恢复时补成 manual；重新加入或听写再次答错会回到待复习。答对不自动移出。
5. 锦囊库没有已学会按钮/入口，也不按已学会过滤条目；只提供加入单词本/已加入的单向操作，已加入不能在锦囊库取消。个人操作不删除锦囊库原内容。
6. 网格列表不显示发音按钮和收藏来源文字；卡片原有发音/原句保留。已学会网格用“+ 恢复”，生词本网格用“已学会”，不能混淆操作方向。
7. 显示模式统一叫卡片/列表；全部只表示合集筛选范围。生词本标签为“卡片”“列表 · N”。
8. 页面/栏目标题统一无衬线。共享头部/样式只维护一份，不要复制组件后各改各的。
9. 从我的学习继续/复习进入场景时，URL 携带 from=membership；返回按钮、面包屑、导航选中态、上一集/下一集/相关课程都保留这个来源。刷新后仍返回我的学习。普通场景库/直接课程链接仍返回场景库。
10. 消息中心入口在我的学习标题行信封；全站导航仅有未读红点。到期提醒本地计算，公告运行时读取 JSON，已读状态只存 localStorage；没有手机推送。查看更多详情是站内目标链接，没有另建消息详情页。
11. 空数据页有统一插图与提示，不生成示例/种子学习记录。

## 必须复用的组件与逻辑

- `src/app/components/KitEntryCard.tsx`：KitPageLayout / EntryCard / EntryCardReview，包含原声、例句切换、翻卡导航、可注入的操作槽。
- `KitEntryList.tsx`：锦囊库、生词本列表、已学会页共用网格，桌面三列/平板两列/手机单列。
- `PageSectionHeader.tsx` + `src/styles/page-section-header.css`：固定两种视图头部；不要按 review/list 换两套 header/back/description class。
- `PageHeading.tsx` + `src/styles/headings.css`：统一标题。
- `ViewModeSwitch.tsx`：统一模式名称与切换控件。
- `LearningEmptyState.tsx`：空数据插图与文案。
- `ContinueLearningSection.tsx` / `LearningSceneRows.tsx`：进度行与分批展开。
- `NotebookEntryActions.tsx`：生词本已学会操作；`KitLearningActions.tsx`：锦囊库/点词浮卡单向加入。
- `src/data/member-learning.ts`：学习状态、持久化队列、离线重试、notebookEntries、学会/恢复。
- `src/data/scene-navigation.ts`：来源标记与固定站内返回路径；`nav-utils.ts` 共用它。
- `src/data/messages.ts` / `learning-overview.ts`：消息、已读、到期提醒及筛选。
- 页面入口在 `MembershipPage.tsx`、`LearningPages.tsx`、`KitPage.tsx`、`SceneDetailPage.tsx`；路由在 `App.tsx`。

## 本地运行与验证

本机 Node 为 v24.14.1，使用 npm（测试直接加载 TypeScript，需要兼容 Node 版本）。

```sh
npm ci
npm ci --prefix aliyun-membership-api
npm run dev
npm run kit:test
npm run learning:test
npm run learning:ui:test
node --test tools/kit/membership-code.test.mjs
npm run build:staging
```

本轮交接前验证：61 项测试通过，staging build 通过。此前浏览器已验证：

- 生词本、锦囊库在 1440×900 / 375×667 切换时，返回/标题/说明/筛选区的边界、字号、字重、颜色一致。
- 列表与翻卡切换正常；Kit 列表 174 项，生词本按真实记录计数。
- 双浏览器/刷新/离线队列的学会与恢复，以及原收录元数据保留有测试覆盖。
- 继续学习 3→6→3 展开/收起、已学完跳转、课程来源返回/下一集/刷新均已检查。

不要为了查看样式而改动真实会员记录。之前本地交互测试使用临时独立端口和模拟数据，临时 HTML 已删除，不提交、不发布示例记录。

## 只部署 staging

```sh
npm run deploy:staging
```

该脚本固定目标 `oss://yz-english-site-staging/`，没有桶参数，先 build 并检查 staging API URL。

- `.env.staging` 只有公开的 URL 配置，可以提交。
- staging 公告地址 `/announcements.json`，位于 staging 自己的公开桶。部署排除该运行时文件，仅缺失时初始化，避免覆盖后续运营公告。
- 正式公告通道为 `https://go.learnyzenglish.com/content/kit/announcements.json`，本轮未写入。
- staging 的单页应用 fallback 为 index.html + HTTP 200，已修复直接访问子页面返回 404 的问题。
- `aliyun-membership-api/ram-staging-runtime-policy.json` 是非敏感权限模板，不表示需要重新改云端角色。
- 不提交 `.env.*.local`、凭据、函数环境导出、受限临时文件、node_modules、dist 或音频缓存。

## 公告发布流程的仓库外改动

新场景发布脚本位于父工作区 `01_Workflow/yz-english-publish-scene/scripts/publish_scene.py`，不在这个站点 Git 仓库内。本机已加上“课程校验成功后生成公告”钩子。

Git 中通过 `tools/messages/publisher.patch` 保留了这处修改；另一台电脑若也接管完整场景发布工作区，需要对那份脚本应用补丁。不要假设 clone 站点仓库后就自动拥有父目录的脚本。

公告合并/发布工具与说明在 `tools/messages/`；本轮没有执行正式场景发布或正式公告上传。

## 尚待处理

等待用户验收 staging；没有正式站发布授权。后续 AI 继续接收用户反馈，优先使用上述共享组件。

历史部署过程在 `tools/staging/DEPLOYMENT-STATUS.md`。早期关于 403、过期登录、RAM/函数未建的记录已经过时，以本文当前状态为准。
