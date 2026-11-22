# 站内公告

浏览器运行时读取 `https://go.learnyzenglish.com/content/kit/announcements.json`，与锦囊库走同一内容通道。每分钟和回到页面时重新校验文件，无须重新 build。文件缺失、损坏或网络失败时保留上次有效列表（首次为空），不生成示例公告。

格式：
```json
{"announcements":[{"id":"notice-2026-11-21","type":"announcement","title":"公告标题","body":"公告正文","publishedAt":"2026-11-21T12:00:00Z","href":"/explore"}]}
```

`id` 必须唯一且稳定；`type` 为 `announcement` 或 `new-scene`；`href` 可省略，仅允许站内绝对路径。时间未到的公告不展示。已读 ID 只存本浏览器 localStorage，个人到期提醒由会员有效期在客户端计算，不上传、不推送。

`merge-announcement.mjs` 合并新集条目，保留手工公告，按场景 externalId 去重，不做任何云端写入。工作区 `01_Workflow/yz-english-publish-scene/scripts/publish_scene.py` 已接入：课程验证成功后才更新公告文件，首次不存在时创建空表；其他读取错误拒绝覆盖。发布失败后可从 receipt 的 `announcementPublished` 状态识别并重试公告，不重复上传课程。如需重试，从 receipt 提取 `entry` 到 JSON，再运行 `node tools/messages/publish-scene-announcement.mjs entry.json`。该发布流程本轮未执行。外层工作区脚本的变更同时保存在 `publisher.patch`，便于在其他电脑应用。

Staging 通过 `.env.staging` 的 `VITE_ANNOUNCEMENTS_URL=/announcements.json` 读取测试桶自己的公告，测试不会发布到正式内容通道。初始文件在 `public/announcements.json`，保持空数组，不放测试或示例内容。
