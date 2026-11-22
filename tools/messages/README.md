# 站内公告与消息详情

浏览器运行时读取 `https://go.learnyzenglish.com/content/kit/announcements.json`，与锦囊库走同一内容通道。每分钟和回到页面时重新校验文件，无须重新 build。文件缺失、损坏或网络失败时保留上次有效列表（首次为空），不生成示例公告。

格式：
```json
{"announcements":[{"id":"notice-2026-11-21","type":"announcement","title":"公告标题","body":"第一段完整正文。\n\n第二段完整正文。","publishedAt":"2026-11-21T12:00:00Z","action":{"label":"查看课程","path":"/scenes/example"}}]}
```

- `id` 唯一且稳定；`type` 为 `announcement` 或 `new-scene`；`body` 为全文，支持换行（纯文本，不执行 HTML）。列表只通过样式显示两行，详情展示全文。
- `action` 可省略；有目标时同时提供 `label` 和 `path`，只允许 `/` 开始的站内路径，禁止外部 URL、协议相对地址、反斜杠和空白/控制字符。
- 兼容旧公告顶层 `href`，自动提供对应动作名称；新文件优先使用 `action`。无目标时详情不显示按钮。
- 列表卡片及「查看详情」进入 `/membership/messages/detail?id=...`。详情页进入即把该消息 ID 记为已读，列表、导航红点和我的学习信封共用同一状态。刷新可直接打开详情；不存在/已下线的 ID 显示返回消息中心提示。
- 已读 ID 只存本浏览器 localStorage，个人提醒正文与动作由会员有效期在客户端计算，不上传、不推送。时间未到的公告不展示。

`merge-announcement.mjs` 合并新集条目并生成「去看这一集」动作，保留手工公告，按 externalId 去重，不做云端写入。工作区 `01_Workflow/yz-english-publish-scene/scripts/publish_scene.py` 已接入：课程验证成功后更新公告文件，首次不存在时创建空表；其他读取错误拒绝覆盖。可从 receipt 的 `announcementPublished` 识别并单独重试公告：提取 `entry` 到 JSON，运行 `node tools/messages/publish-scene-announcement.mjs entry.json`。该发布流程本轮未执行；外层脚本变更保存在 `publisher.patch`。

Staging 通过 `.env.staging` 的 `VITE_ANNOUNCEMENTS_URL=/announcements.json` 读取自己桶内的公告。部署保留这个运行时文件；初始 `public/announcements.json` 为空数组，不放测试内容。

仅验证本补充的相关测试：
```sh
node --test tools/messages/messages.test.mjs tools/messages/message-presentation.test.mjs
```
