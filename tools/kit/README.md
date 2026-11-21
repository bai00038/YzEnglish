# 锦囊库三层数据

在 .site-visual-refresh 根目录执行命令。

- catalogue-source.json 保留交付的 127 条表达、原始词汇数组和 10 个合集。
- chunks-source.json 保留交付的 46 条词伙。
- words-source.json 保存新增的 130 条词汇，构建时覆盖 catalogue 的 words 数组。首页按词汇出处去重统计已覆盖合集，当前为 2 / 10。
- `npm run kit:build` 合并新数据，按 audio-index.json 回填已有 audioUrl。保留交付数据的高频顺序、原句锚点和语境。
- `npm run kit:test` 核对三层数量、合集数量、语境片段索引和两份 TTS 清单的稳定 hash。

## TTS 清单

- tts-targets.json 用于表达和词伙，共 173 条。
- tts-words-targets.json 用于词汇，共 130 条。--kit 包含这两份清单，--words 仅选择词汇。
- tts-scenepage-targets.json 仅用于场景页，共 716 条。
- `npm run kit:tts -- --dry-run --kit` 核对锦囊库清单。
- `npm run kit:tts -- --dry-run --words` 核对词汇清单。
- `npm run kit:tts -- --dry-run --scenepage` 核对场景页清单。
- 不指定范围时合并三份清单，原始共 1019 条，按归一化键去重后为 1014 条。旧 expressions-index.json 保留作历史来源，生成脚本已不再读取它。
- 实际生成使用 `npm run kit:tts -- --kit` 或 `npm run kit:tts -- --scenepage`。不带 --upload 时只写本地音频缓存。
- --upload 会写入线上 OSS 并更新音频索引，只在用户明确要求上传音频时使用。
- .env.tts.local 保存 GEMINI_API_KEY，已被 Git 忽略。
- 声音固定 Lumi（en-us-lumi），风格固定 Podcast (Calm, measured delivery)。已有音频按归一化键复用，不重复生成。

## 本地原声片段

src/data/kit/clips-index.json 保留 clips-index-full.json 的 997 个原始键和线上 URL。
clips-delta.zip 的 340 个差量 MP3 位于 tools/kit/clips/，仅作为本地资源。
Vite 的 local-kit-clips 插件在 dev 模式把存在于本地的片段映射到 /@fs/ 路径，供语境加宽片段预览。kit-audio 的 sceneId@anchor_start 查找与播放逻辑原样使用。
生产构建保留线上 URL。本次未上传或覆盖任何线上片段。

本地运行 `npm run dev` 后访问 /kit。无码用户可以预览三张分类卡，点击卡片打开既有输码弹窗。深层内容仍需有效会员状态。

## OSS 运行时数据

- 页面优先请求 `https://go.learnyzenglish.com/content/kit/` 下的 catalogue.json、clips-index.json、audio-index.json。
- 开发环境经现有 `/dev-content/kit/` 代理请求同一份 OSS 数据。
- 使用默认 HTTP 缓存协商，OSS 对象设为 `Cache-Control: no-cache`。每次刷新重新校验；同一页面内共享请求，避免重复下载。
- HTTP 错误、网络故障、5 秒超时、无效 JSON 或不合法的数据结构自动回退本地打包版。三份本地保险数据保留在首包中，回退无需再下载独立 JSON chunk。
- TTS 播放优先使用运行时 audio-index 的最新地址，再使用 catalogue 自带的 audioUrl。
- catalogue 首传由用户负责。此次仅首传两个 index，不部署网站页面。
- `npm run kit:test` 同时覆盖数据完整性、远程优先、请求共享、刷新更新及失败回退。

## 点词卡 §十一 13:41

- 只划线词汇，按集和行锚点匹配。词伙、表达及知识点板块不改。
- words-source.json 的 130 词已补齐 pos 和 note；核心义沿用原 meaningZh，note 为基于现有出处的一句用法说明，不是外部词典数据。
- OSS 缺少 pos/note 时，页面按相同 key 从本地打包 catalogue 补齐；OSS 已有字段始终优先。完整 catalogue 可用于下次授权的数据更新。
- 单词 TTS 喇叭常驻；没有音频时会显示加载失败/制作中反馈，不冒充可播放。
- 例句排除当前出处、去重并优先其他场景，只显示一条。无其他出处时例句与数量提示均隐藏。
- 数量提示为纯文字，不再跳转锦囊库。
- **上线前必须执行 `npm run kit:check-word-tts -- --remote`**。130 词的 OSS 发音未齐备时该检查返回失败；本地构建与预览仍允许。
