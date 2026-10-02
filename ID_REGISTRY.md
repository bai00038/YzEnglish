# YZ English 内容编号台账

所有已分配的内容编号登记在此。新视频/新场景发号前必须先查本表，杜绝冲突。
格式：`{系列}-{包号}-{集号}`，如 `SH-01-004`。

## 系列代码
| 代码 | 含义 | 备注 |
|------|------|------|
| SH | Shopping English（购物英语） | 01=美妆护肤，02=服装购物 |
| HC | Healthcare English（医疗英语） | 01=约诊所，02=牙科，03=药房 |
| SF | 家校沟通 | |
| DL | Daily Life（日常生活） | 2026-10-01 新开 |
| ST | Small Talk | 另有独立 24 条规划表，见 Small_Talk.xlsx |
| PET | 宠物英语 | 试水 3 条：pet-02/03/04 |

## 已分配编号（2026-10-01）
| 新编号 | 旧标识 | 标题 | 状态 |
|--------|--------|------|------|
| SH-01-004 | — | Choosing a Gentle Makeup Remover（挑选温和的卸妆产品） | 新管线已发 |
| SH-02-001 | scene-001 / id 28 | Shopping for Clothes | 网站老场景待迁移 |
| SH-02-002 | scene-004 / id 31 | Requesting a Price Adjustment at Costco | 网站老场景待迁移 |
| HC-01-002 | — | Calling About a Child's Fever（孩子发烧时电话约诊） | 新管线已发 |
| HC-02-001 | scene-013 / id 40 | Getting a Dental Filling | 网站老场景待迁移 |
| HC-02-002 | scene-030 / id 41 | Dental Implant Surgery | 网站老场景待迁移 |
| HC-03-001 | scene-018 / id 43 | Picking Up a Prescription | 网站老场景待迁移（药房包号待最终确认） |
| SF-01-001 | scene-027 / id 42 | Parent-Teacher Meeting | 网站老场景待迁移 |
| SF-04-003 | — | （见 SF-04-003-dialogue.txt） | 已存在 |
| DL-01-001 | scene-008 / id 35 | Dining at a Turkish Restaurant | 网站老场景待迁移 |
| ST-01-001~004, ST-02-001~004, ST-03-001~004 | — | Small Talk 第一季 12 条首发 | 规划中 |
| pet-02 | — | 第一次看兽医 | 试水 |
| pet-03 | — | 狗公园冲突 | 试水 |
| pet-04 | — | 买狗粮 | 试水 |

## 迁移状态
- Supabase → 阿里云 OSS 迁移：2026-10-01 完成。7 场景（SH-02-001/002、DL-01-001、HC-02-001/002/003、SF-01-001）素材（cover.jpg/video.mp4/handout.pdf）+ scene.json + content/index.json 已上传至 `content/`，R2 旧链路可退役。Supabase 项目可关闭。
