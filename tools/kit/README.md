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
- 当前声音为 Kore，风格为 Podcast。Gemini 3.8 的朗读正文只传目标词句，风格单独放在 `speechMetadata.style`，不得把指令写进正文。
- 正确缓存使用 `.tts-cache/kore-podcast-lufs16-v2/`；v1 的 249 条已因读出提示语而撤回，不能当作已完成音频复用。
- 生成后执行 `node tools/kit/check-tts-content.mjs`：用 Gemini 3.5 Transcribe 专用逐字转写核对实际音频并严格对照目标文本，将结果及文件 SHA-256 保存为 `content-qa.json`。数字等转写差异也会阻止发布，需要核查，不能跳过。
- `--upload` 会要求每个目标都有与当前文件和请求配置匹配的成功转写记录。仅能解码、响度正常或传输哈希一致，都不代表朗读内容正确。

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

## 2026-11-23 续跑记录

- 当前锦囊库清单为 347 条（表达/词伙 173、词汇 174）；本批按表达/词伙原顺序生成，从 Of course 到 I need to，下一条 I wanted to。
- 新增 85 条；81 条内容核对通过，4 条待复核（Could I、Please don't、At this point、How does）。加上此前 Thank you 样音，v2 缓存共 86 条。86 条均通过解码、MP3/单声道/24kHz 与峰值检查。
- TTS 和专用在线转写均明确返回每日 100 次请求额度耗尽，已停止 API 调用；生成的成功文件数不等于请求次数。未上传 OSS、未修改网站播放索引，也未动 Muse 的旧批次裁剪成果。
- 通用生成模型曾对 1 秒 Have you 样音转写出无关长句；离线 Whisper 和专用转写均证实实际是 Have you。原失败记录保留在 content-qa.json 的 previousCheck 中。核对器现改用专用转写，请求间隔至少 11 秒；默认遇到内容不符停止，--continue-on-mismatch 仅将不符项留待复核并继续，不会标为通过，最终仍以非零状态提示待复核。
- 在线额度用完后，剩余 30 条用本机 Whisper base.en 全片转写（无目标文本提示、无裁剪）核对；只有归一化文字完全匹配且逐词最低 probability >= 0.4 才计入通过，其他留待复核，不以期望文字伪造通过。
- 结果均在 .tts-cache/kore-podcast-lufs16-v2/：preview-2026-11-23.html、batch-report-2026-11-23.json/.csv、technical-qa-2026-11-23.json、offline-asr-2026-11-23.jsonl 与 content-qa.json。内容核对有遗留通用模型、专用模型、离线模型三种来源，实际来源见逐条 transcriptModel（无该字段的旧记录为 gemini-3.8-flash）。
