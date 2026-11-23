# Split player（私有复用模块）

单一入口 `index.tsx`；`engine.ts` 不依赖 React、YZ 会员、课程规则或进度存储。

- `SplitPlayerProvider` 在应用级挂载一个持久 audio；`useSplitPlayer()` 取引擎。不要把 Provider 放进会随课程卸载的页面。
- `setPlaylist(Track[], resolver?)`：网站给出已经筛选/排序的队列。Track 包含 id/title/artwork/videoUrl/audioUrl/lowUrl，可附 timing；resolver 可异步换成签名地址。
- `load(id, { startTime, autoplay })`：切集。同 id 不重置；异步过期请求不能覆盖后来的切集。每次真正切集重置降级状态。
- `attachVideo(video|null)`：静音画面跟随；原生视频 play/pause/seeking/ratechange 转成主时钟操作。不要再给 video 渲染 source 或由 React 维护 src。
- `play()` 保持当前模式；`playEpisode()` 进入整集；`pause()/seek(seconds)/setRate(rate)` 都以当前主时钟为准。
- `playRange({start,end,id}, 'listening'|'dictation', repeat)`：句子边界按音频计时；`clearRange()/setMode()/setRangeRepeat()` 更新练习状态。`setLoop()` 只控制整集循环，两种循环互不覆盖。
- `on(callback)` 返回取消订阅函数。事件有 trackchange/time/play/pause/ended/rangeend/fallback/error；每次携带 track/time/duration/mode/fallback。进度写入由接入层负责。
- `adjacent(-1|1)` 只访问给定队列；Media Session 在 Android/桌面保留播放/暂停/上下集，seek 类 handler 置 null；iOS 恢复播放/暂停/快进/快退/定位，上下集 handler 置 null。策略由通用环境参数 sessionNavigation 控制；metadata 和 position 继续同步。页面内 seek API 不变。
- `stop()/destroy()` 清理源、计时器、事件和 Media Session。

音频正常时为主时钟；超过 0.3 秒漂移纠偏，避开 seek 后 900ms；重复失败或音频错误回主视频原声；主视频文件错误或前台缓冲等待 8 秒回 lowUrl。降级时以 video 为主时钟，不能保证锁屏。后台分轨移除 video.src 并 load 中止取流；回来再加载当前集、同步到音频进度，不换音频元素。

## 接入另一个项目

1. 拷贝本目录，在 React Router 等应用壳内挂 Provider。
2. 自己准备 Track 队列、鉴权 URL resolver 和学习 timing；不改核心以适配业务字段。
3. 页面把 video ref 接 attachVideo，把句子操作接 playRange，把进度/切集事件接自己的网站逻辑。
4. 调整元数据封面和标题；非 React 项目可直接实例化引擎并调用 start/destroy。

YZ 接入层在 `app/components/ScenePlaybackProvider.tsx`；合集 live/order 规则在 `data/scene-playback-model.ts`，与页面上下集共用。会员接口仍校验课程目录与会话，只增加 MP3 扩展名。

相关自动检查：`node --test tools/player/*.test.mjs`；签名检查：`node --test --test-name-pattern='signs' aliyun-membership-api/test/app.test.cjs`。不用 Gemini、转写或 TTS 脚本。

真机必须按 PLAYER_SPEC_lockscreen.md 的设备矩阵验证锁屏 30 秒、蓝牙拔插、后台切集、循环、听写、弱网降级。桌面模拟和单元测试不能替代 iPhone / 微信锁屏验收；通过前不能发布正式站。清单新字段已写入本地 manifest，运行时也兼容旧 manifest 的 101 集资产映射，不会为此改写正式 OSS manifest。

## 本轮 staging 记录

- 已部署到 https://staging.learnyzenglish.com 。只更新 staging 网站与 `yz-english-membership-api-staging` 的扩展名白名单；正式网站、正式函数、正式 manifest 未改写。
- 播放器/HTTPS 相关 15 项检查 + 会员签名 2 项检查通过。初次联调后针对片尾事件顺序保护作一次必要重建；未运行全站回归，也未调用任何 Gemini/TTS/转写脚本。
- 桌面 Chrome 实际验证：音频为主、video 静音；原生控件起播；单句按音频边界停止；1.2 倍循环无累积漂移；会员 MP3 获取带签名地址并加载；《跟牙医描述牙疼》自然播完自动进入《拍牙片》继续播放。
- 手机尺寸模拟验证：没有自定义大播放按钮，精听/听写入口及画面跟随仍可用。后台断流/锁屏按键/降级等状态路径由相关自动测试覆盖，不能把浏览器工具的聚焦模拟当成真正锁屏测试。
- 真机未验收：iPhone Safari / 微信、安卓 Chrome / 微信、锁屏 30 秒与画面对齐、锁屏上一/下一集、蓝牙拔插、弱网小合并版降级及下一集恢复分轨。请按根目录规格抽样验收，全过后再由用户发布正式。
- 建议样本：`viewing-a-rental-house`（本地 manifest 最长 1:17）、`describing-different-types-of-pain`（25 句）、`grocery-checkout-and-paying`（听写）、`elevator-small-talk`（短句停顿）；无 timing 老集另按实际内容选择，缺 timing 的连续播放路径已在引擎测试覆盖。
- 将来正式发布时，用户还需将正式签名 API 同步为支持同目录 MP3；只 build+sync 前端、仍使用旧正式签名白名单，会使会员课程回退到主视频。正式 API 源码改动仅为 app.cjs 的 `mp4|mp3|pdf` 白名单，不涉及角色、密钥或账号系统。

## iPhone 锁屏切集按钮：单次实验（2026-11-22）

- 原版结果：用户报告 iPhone 锁屏没有显示上一集/下一集按钮。
- 本实验：`registerSession` 对 seekto / seekbackward / seekforward 显式调用 setActionHandler(action, null)，仅保留 play / pause / previoustrack / nexttrack 四个有效 handler。不改页面拖动、倍速、进度恢复或队列规则。
- 真机结果：用户确认已出现上一集/下一集按钮，但点击后未切集。按钮显示问题已解决；后续修正后的切集结果见下方真机反馈。
- 停止条件：若本版 iPhone 真机仍不显示切集按钮，将验收结果记为“iOS 平台限制：当前锁屏未显示上一集/下一集”，不继续在此问题上改方案或反复试验。

## 单集循环与锁屏切集修正（2026-11-22）

- 整集循环现位于主视频字幕开关左侧，使用纯 Repeat 图标（开启品牌绿、关闭灰色）；精听区使用 Repeat1 图标，两者共用 LoopToggle 组件，播放行为不变。网站接入层以 `yzenglish:episodeLoop` 本地保存偏好；未保存过设置时默认开启，用户手动关闭后保留关闭设置。切页、切集、刷新保留；与单句循环独立，不新增播放按钮。
- 整集自然结束时循环当前集；手动上一/下一集直接切换，保留开关，新集结束后也按该开关处理。
- 先前锁屏回调要等待签名网络请求才调用 play。现在仅提前解析相邻集地址（不预加载媒体），就绪时在同一个回调栈切换 audio 源并调用 play。带有效期的缓存提前一分钟失效；队列/鉴权解析器改变或 stop 时清理缓存，旧异步请求不能恢复已停止的播放。
- 保留四个有效 Media Session handler，seek handler 仍为 null。播放器相关 18 项测试通过，包括后台循环、显式切集优先、单句循环隔离、回调同步起播、过期地址和停止后的异步结果保护；staging 构建通过。没有全量回归或调用音频生成工具。
- 真机反馈（2026-11-22，用户验收）：安卓锁屏可以切集；iPhone 锁屏上一/下一集按钮可见，点击仍不能切集。记录为「当前实现的 iOS 锁屏切集兼容限制」；尚未定位根因，不能据此断言所有 iOS 网页均不支持此能力。用户未提供具体系统版本和浏览器，暂不推断其范围。
- 按本轮停止规则，不再继续试改锁屏切集；保留安卓可用实现。iPhone 锁屏切集未通过验收，单集循环及其他真机能力不因本次反馈视为已通过；正式站不发布。

## 小米浏览器重复锁屏与 iOS 控件恢复（2026-11-22）

- 用户补充：小米自带浏览器，第一次锁屏后解锁、再次锁屏，媒体窗口消失且声音停止。之前回答中的 Chrome 环境已由用户更正，不能作为 Chrome 验收结论。
- 在自动测试中复现两条引擎误停路径：页面已隐藏但 visibilitychange 回调尚未执行时视频先暂停；前台 load 重载的暂停事件迟到。这些视频事件不再向主音频传播。前台原生暂停和锁屏 pause handler 仍有效；不强制恢复用户暂停，不重新加载主音频。
- 音频起播、画面恢复起播和前后台切换后重新同步 handlers、当前集 metadata、真实播放状态与位置。仍在后台移除视频 src 并 load，不恢复后台视频取流。
- 用户要求 iOS 换回原控件：iPhone / iPad（含桌面 UA）使用 seek 控件，显式清空无效的上下集 handler；小米/安卓保留上下集。单集循环及记忆保持。
- 仅运行播放器 23 项相关测试并构建 staging；这证明事件保护和配置规则，不代表小米浏览器或 iOS 真机已通过。待用户复测「播放 → 锁屏 → 解锁 → 再锁屏」及 iOS 控件。
- 参考：媒体会话的最终路由由浏览器管理，页面声明状态不保证系统通知展示，见 [Media Session 规范](https://www.w3.org/TR/mediasession/#routing)。本轮按引擎中可复现的事件漏洞修正，不将观察结果推断为已确定的浏览器根因。
