# 场景上传与合集字段规范

网站继续由 `manifest.json` 驱动，现有视频、封面、场景 JSON、timing JSON 和 PDF 的路径保持不变。合集只负责归集场景，不改变媒体目录。

## 场景字段

每个场景必须具有稳定的 `externalId`。上线场景还必须填写：

```json
{
  "externalId": "FD-01-001",
  "collectionId": "C7",
  "collectionOrder": 1,
  "tags": ["dining", "daily"],
  "status": "live",
  "isFreeExperience": false
}
```

- `collectionId`：唯一归属，只能是 C1–C12 之一；不要使用数组。
- `collectionOrder`：在合集中的内容流程序号，从 1 开始，不按发布时间排序。
- `tags`：用于全站分类筛选，可多选；合法值为 `medical`、`shopping`、`daily`、`school`、`parenting`、`dining`、`settling-in`、`travel`、`work`。
- `status`：`live` 或 `coming`。媒体未上传完成时使用 `coming`，页面展示但不可进入。
- `isFreeExperience`：仅固定三个场景为 `true`：SH-01-007、ST-01-001、FD-01-001。

## 合集

合集定义在 `collections.json`，编号和货架顺序固定：C1 牙科、C2 看病就医、C4 家校沟通、C5 日常寒暄、C6 跟孩子互动、C7 餐厅点餐、C8 购物、C9 安家办事、C10 旅行、C11 职场、C12 日常生活。C3 已停用。C11 当前使用 `hidden: true` 暂不展示。

## 上传要求

1. 本地场景文件夹名称建议直接使用稳定 `externalId`，例如 `DL-01-007`。
2. 上传媒体后，只在 manifest 中补齐现有 OSS URL；不要因合集调整移动或重命名媒体。
3. 新场景先确定唯一 `collectionId` 和未占用的 `collectionOrder`。
4. 发布前运行 `npm run validate:collections`（或 `node tools/oss-manifest/validate-collections.mjs`）。也可把待检查 manifest 路径作为第一个参数传入。

校验失败时会列出具体场景名。
