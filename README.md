# HeartopiaHub

Heartopia 游戏攻略站 MVP。纯静态站点，直接部署到 Cloudflare Pages。

- 技术栈：Astro 5（静态输出）+ 原生 CSS，零前端框架
- 数据与 UI 完全分离：所有内容放在 `src/data/*.json`
- 移动端优先，SEO 友好（canonical / OG / Twitter Card / JSON-LD / sitemap / robots）
- 新增数据不需要修改页面组件；新增「图鉴类」模块也不需要新增页面文件

## 当前收录

| 模块 | 路由 | 条数 |
| --- | --- | --- |
| 兑换码 | `/codes/` | 10 |
| 烹饪食谱 | `/cooking/` | 86 |
| 鱼图鉴 | `/fish/` | 85 |
| 昆虫图鉴 | `/bugs/` | 65 |
| 材料图鉴 | `/materials/` | 18 |
| NPC 图鉴 | `/npcs/` | 16 |
| 地点图鉴 | `/locations/` | 4 |
| 种植攻略 | `/farming/` | 21 |
| 赚钱攻略 | `/money/` | 16 |
| 新手指南 | `/beginner/` | 16 |
| 互动地图 | `/map/` | 48 个点位（9 个区域） |

合计 385 条内容、341 个静态页面。

---

## 快速开始

```bash
npm install
npm run dev          # 本地开发 http://localhost:4321
npm run build        # 数据校验 + 搜索索引 + 地图数据 + 构建到 dist/
npm run preview      # 预览构建产物
```

## 把项目放到 D 盘

用附带的脚本一键迁移并构建（默认 `D:\codex\projects\HeartopiaHub`）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-d-drive.ps1
```

只复制不构建加 `-SkipBuild`。

---

## 目录结构

```
HeartopiaHub/
├─ astro.config.mjs              # 站点配置（site / sitemap / static 输出）
├─ public/
│  ├─ favicon.svg, og-default.svg
│  ├─ list-filter.js             # 通用列表筛选（搜索 + 标签筛选）
│  └─ search-index.json          # 构建时自动生成
├─ scripts/
│  ├─ check-data.mjs             # 数据校验，构建前自动执行
│  ├─ build-search-index.mjs     # 生成全站搜索索引
│  ├─ build-map.mjs              # 由鱼 / 昆虫 / NPC / 地点数据生成 map.json
│  ├─ import-wiki.mjs            # 从 heartopiawiki.com 导入数据
│  └─ setup-d-drive.ps1          # 迁移到 D 盘并构建
└─ src/
   ├─ data/                      # ★ 所有内容数据
   ├─ lib/
   │  ├─ content.js              # 数据出口 + 工具函数
   │  └─ collections-config.mjs  # 通用图鉴模块配置
   ├─ components/                # Header / Footer / SearchBox / FilterBar / Breadcrumbs
   │  └─ CollectionList.astro, CollectionDetail.astro   # 通用图鉴列表 / 详情
   ├─ layouts/BaseLayout.astro
   ├─ styles/global.css
   └─ pages/
      ├─ index.astro             # 首页（模块入口自动生成）
      ├─ [collection]/index.astro, [collection]/[slug].astro   # 通用图鉴路由
      ├─ codes/, cooking/, fish/, farming/, money/, beginner/, map/, search/, 404
      └─ robots.txt.ts           # 跟随 SITE_URL 自动生成
```

## 两种页面模式

**1. 专用模块**（`cooking` / `fish` / `farming` / `money` / `beginner` / `map` / `codes`）
字段结构差异大，各有自己的列表页和详情页，可以自由定制表格、图表、地图等。

**2. 通用图鉴模块**（`bugs` / `materials` / `npcs` / `locations`）
字段结构统一（`slug / name / category / location / time / weather / level / price / description / facts / tips`），
共用 `src/pages/[collection]/index.astro` 与 `[slug].astro` **两个页面文件**。
新增这类模块不需要写任何页面代码。

### 新增一个通用图鉴模块（例如「鸟类图鉴」）

1. 在 `src/data/birds.json` 放数据（字段约定见 `src/lib/collections-config.mjs` 顶部注释）
2. 在 `src/lib/collections-config.mjs` 的 `collectionConfigs` 里加一条配置
3. 在 `src/lib/content.js` 里 import 该 JSON，并加进 `collectionData`
4. 在 `src/data/site.json` 的 `modules` 里登记（决定导航、首页入口和页脚）

导航、首页卡片、页脚、搜索索引、数据校验、sitemap、JSON-LD 都会自动带上它。

---

## 数据来源与导入

- `fish.json`、`bugs.json`、`materials.json`、`npcs.json`、`locations.json`、`farming.json`、`recipes.json` 中
  `source: "wiki"` 的条目来自社区 wiki [heartopiawiki.com](https://heartopiawiki.com) 的 Cargo API，
  字段做了清洗（去 HTML / wikitext / Unknown 占位值）。
- `farming.json` 的作物数据（种子价、售价、生长时间、解锁等级）全部来自 wiki 的 Crops 表；
  季节与生长时间的原始写法很杂，脚本里用 `CROP_SEASON_MAP` / `CROP_GROWTH_FALLBACK` 做了归一化，换算不了的原文保留。
- `recipes.json` 里 wiki 条目的**材料数量**由 `npm run data:import recipe-details` 从各食谱详情页解析补全（不是 Cargo 表里的字段）。
- `codes.json`、`money.json`、`beginner.json`、`farming.json` 以及 `recipes.json` 中
  `source` 不是 wiki 的条目为手工整理的原创内容。
- `map.json` **不是手工维护的**，由 `npm run data:map` 从鱼 / 昆虫 / NPC / 地点四份数据聚合生成。
- 表情图标、文案、页面结构均为本项目原创，未复制其他站点。

重新导入（需要联网）：

```bash
npm run data:import                 # 全部：bugs / materials / npcs / locations / crops / recipes / recipe-details
npm run data:import bugs            # 只导入指定模块
npm run data:import crops           # 只重建作物数据（会覆盖手写的 farming.json）
npm run data:import recipe-details  # 只补全食谱的材料数量
```

注意：`recipes.json` 采用合并策略——手工条目会保留，只替换上一次从 wiki 导入的条目。

### 已知的数据缺口

- 鸟类（Birds 表 58 条）只有时间和天气，地点与价格几乎全是 Unknown，暂时没有导入
- 家具（3 条）、消耗品（1 条）数量太少，不值得单独做模块；Quests / Fashion 两张表是空的
- 作物（Crops 表 38 条）单位混乱（`2 Hours` / `A few days` / `Unknown` 混用），已暂缓导入
- 66 条 wiki 食谱里，还有 15 条的 wiki 页面本身没写材料（Picnic Set、Afternoon Tea 等），数量仍为未知
- 兑换码没有可靠数据源，只保留社区流传且标注了状态的条目
- wiki 的 Locations 表只有 4 条记录，地点图鉴的商店覆盖还很有限

---

## 如何新增数据

只编辑 `src/data/*.json`，然后重新构建。

### 通用图鉴类（昆虫 / 材料 / NPC / 地点）

```json
{
  "slug": "rainbow-beetle",
  "name": "Rainbow Beetle",
  "category": "昆虫",
  "location": ["Forest"],
  "time": ["Day", "Evening"],
  "weather": ["Rainbow"],
  "level": "5",
  "price": 200,
  "description": "一句话简介。",
  "facts": [{ "label": "出现等级", "value": "5" }],
  "tips": ["提示一", "提示二"]
}
```

- `slug` 必须唯一，决定详情页网址
- 数组字段的取值会自动汇总成筛选标签，**不需要手动维护筛选列表**
- `price` 为 0 表示价格未知，页面不显示价格
- `facts` 是模块自己的补充字段，加什么就显示什么，不用改组件

### 互动地图

`map.json` 是生成物，不要手改。点位来自四份数据：

| 来源 | 生成的点位 |
| --- | --- |
| `fish.json` | 每个出没地点一个钓鱼点 |
| `bugs.json` | 每个出没地点一个昆虫点 |
| `npcs.json` | 每个 NPC 一个标记，落在其常驻位置所属区域 |
| `locations.json` | 每家商店 / 地标一个标记 |

区域归并规则写在 `scripts/build-map.mjs` 的 `LOCATION_REGION`：新增地点名时补一条映射即可，
漏映射的点位会让脚本直接报错退出。坐标是按区域色块均匀排布的**示意坐标**，不代表真实距离。

### 专用模块的必填字段

| 文件 | 必填字段 |
| --- | --- |
| `codes.json` | `code`、`reward`、`status`（`active` / `limited` / `expired`） |
| `recipes.json` | `slug`、`name`、`category`、`sellPrice`、`ingredients[]`、`tips`（`steps`、`facts` 可选） |
| `farming.json` | `slug`、`name`、`season`、`growthTime`、`seedCost`、`sellPrice`、`profit`、`unlockLevel`（`regrow` 可为 `true`/`false`/`null`，`null` 表示 wiki 未记录；生长时间支持「N 天 / N 小时 / N 分钟」，页面的理论日收益按此换算） |
| `money.json` | `slug`、`title`、`summary`、`difficulty`、`incomePerHour`、`timeRequired`、`requirements`、`steps`、`tips` |
| `beginner.json` | `slug`、`title`、`summary`、`category`、`readTime`、`sections[]`、`tips` |
| `map.json` | `markers[]` 的 `id`、`name`、`category`、`region`、`x`、`y`、`description`；`category` / `region` 必须已定义 |

字段写错或漏写不会静默失败：`npm run build` 前会跑 `npm run data:check`，直接报出是哪个文件、第几条、缺什么。

```bash
npm run data:check     # 只校验数据
npm run data:index     # 只重建搜索索引
npm run data:map       # 只重建地图数据
```

---

## 部署到 Cloudflare Pages

1. 把项目推到 GitHub
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接该仓库
3. 构建设置：
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node 版本：`20`
4. 环境变量（推荐）：

   | 变量 | 说明 |
   | --- | --- |
   | `SITE_URL` | 正式域名，例如 `https://heartopiahub.com`，用于 canonical、sitemap、robots |

5. 首次部署完成后把 `SITE_URL` 改成正式域名再重新部署一次。

任何静态托管都可以：Vercel、Netlify、GitHub Pages、对象存储 + CDN，产物就是 `dist/`。

---

## MVP 范围与后续

已跑通：11 个模块的列表页与详情页、关键词搜索 + 标签筛选、导航即时搜索、互动地图、SEO 元信息、sitemap、404、移动端导航、数据校验。

刻意留白：后台管理、数据库、登录、评论、用户收藏。数据量继续增长后如果手写 JSON 变慢，再考虑 CSV → JSON 脚本或 Headless CMS，页面层不需要改。

## 内容声明

本站是非官方社区攻略站，与 Heartopia 官方无关联。数据由社区整理，可能随版本变动，请以游戏内为准。
