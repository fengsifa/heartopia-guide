# HeartopiaHub

Heartopia 游戏攻略站 MVP。纯静态站点，直接部署到 Cloudflare Pages。

- 技术栈：Astro 5（静态输出）+ 原生 CSS，零前端框架
- 数据与 UI 完全分离：所有内容放在 `src/data/*.json`
- 中英双语：默认英文，中文浏览器自动落到中文；URL 独立可抓取（`/en/...`、`/zh/...`），带 hreflang
- 移动端优先；SEO 由 `src/lib/seo.mjs` 统一生成（唯一 title / description / canonical / JSON-LD / sitemap / robots）
- 新增数据不需要修改页面组件；新增「图鉴类」模块也不需要新增页面文件
- 全站文案集中在 `src/i18n/`，页面里不写 `if (locale === 'zh')`

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

合计 385 条内容。每条内容都会为中英两种语言各生成一个页面，因此构建产物是
**341 个逻辑页面 × 2 = 682 个 HTML**（另有 404 页）。

---

## 快速开始

```bash
npm install
npm run dev          # 本地开发 http://localhost:4321
npm run build        # 数据校验 + 搜索索引 + 地图数据 + 构建到 dist/
npm run preview      # 预览构建产物
npm run seo:check    # 扫描 dist/ 做全站 SEO 自检（构建后运行）
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
│  └─ search-index.en.json, search-index.zh.json   # 每种语言一份，构建时自动生成
├─ scripts/
│  ├─ check-data.mjs             # 数据校验，构建前自动执行
│  ├─ build-search-index.mjs     # 生成中英两份搜索索引
│  ├─ build-map.mjs              # 由鱼 / 昆虫 / NPC / 地点数据生成 map.json（含中英说明）
│  ├─ build-sitemap-alias.mjs    # 把 sitemap 分片合并成对外统一入口 dist/sitemap.xml
│  ├─ check-seo.mjs              # 构建产物 SEO 自检（title / canonical / hreflang / JSON-LD / sitemap / robots）
│  ├─ import-wiki.mjs            # 从 heartopiawiki.com 导入数据
│  └─ setup-d-drive.ps1          # 迁移到 D 盘并构建
└─ src/
   ├─ i18n/                      # ★ 双语收口的地方
   │  ├─ config.mjs              # 语言列表 / 默认语言 / 路径与 hreflang 工具
   │  ├─ ui.mjs                  # ★ 全站 UI 文案（en + zh 两份，键完全对应）
   │  └─ data.mjs                # 数据字段本地化：术语表 + 单位替换 + 英文原文判定
   ├─ data/                      # ★ 所有内容数据（一份数据，按语言取字段）
   ├─ lib/
   │  ├─ content.js              # 数据出口 + 工具函数（含按语言取值的访问层）
   │  ├─ seo.mjs                 # ★ SEO 文案与 JSON-LD 生成（新增模块无需改这里）
   │  └─ collections-config.mjs  # 通用图鉴模块配置（每项含 nameEn / descEn / labelEn）
   ├─ components/                # Header / Footer / SearchBox / FilterBar / Breadcrumbs
   │  └─ CollectionList.astro, CollectionDetail.astro   # 通用图鉴列表 / 详情
   ├─ layouts/BaseLayout.astro   # canonical / hreflang / og:locale / JSON-LD
   ├─ styles/global.css
   └─ pages/
      ├─ index.astro             # 根路径：英文首页副本 + 按浏览器语言分流
      ├─ 404.astro               # 默认语言（英文）
      ├─ [locale]/               # ★ 所有页面都在语言段下面
      │  ├─ index.astro          # /en/、/zh/ 首页
      │  ├─ [collection]/index.astro, [collection]/[slug].astro   # 通用图鉴路由
      │  ├─ codes/, cooking/, fish/, farming/, money/, beginner/, map/, search/
      └─ robots.txt.ts           # 跟随 SITE_URL 自动生成，声明 /sitemap.xml
```

## 中英双语

### URL 与默认语言

| 地址 | 语言 |
| --- | --- |
| `/en/...` | 英文（默认语言，canonical 指向自己） |
| `/zh/...` | 中文 |
| `/` | 英文首页的副本，canonical 指向 `/en/`，不进 sitemap |

- 默认语言是英文：直接访问 `/en/fish/` 永远是英文，不会被改写
- 根路径 `/` 只做一次「按偏好分流」：先读 `localStorage` 里手动选择过的语言，
  没有再按 `navigator.languages` 判断 —— 只有含 `zh`（`zh` / `zh-CN` / `zh-TW` 都算）时才
  `location.replace('/zh/')`，其他语言一律留在英文首页
- **没有任何 301 / 302**，`/en/` 与 `/zh/` 之间不互相跳转，避免搜索引擎抓不到其中一个版本
- 页面对之间用 `<link rel="alternate" hreflang="en|zh-CN">` 互链，并输出 `x-default` 指向英文版

### 手动切换

- Header 里的 `English | 中文` 是真实的 `<a href>`，指向「当前页面的另一种语言版本」
  （`/en/fish/bass/` ↔ `/zh/fish/bass/`），点击时顺手把选择写进 `localStorage: heartopiahub:locale`
- 移动端用的是同一个切换器，不需要展开菜单
- 因为是链接而不是 JS 改写当前页，禁用 JS 也能正常切换

### 数据与文案怎么分语言

一份数据、两种语言字段，页面里既不复制数据也不写 `if (locale === ...)`：

| 位置 | 作用 |
| --- | --- |
| `src/data/*.json` | 唯一数据源。双语字段按 `xxx` / `xxxEn` 成对出现 |
| `src/i18n/ui.mjs` | 所有按钮、标题、提示语。`dict(locale)` 取整棵子树，`t(locale, 'key', vars)` 取单条 |
| `src/i18n/data.mjs` | 数据字段的机械本地化：闭集术语表（料理分类 / 季节 / 地图区域 / facts 标签 / 难度…）+ 单位替换（`N 金币` → `N Gold`）|
| `src/i18n/config.mjs` | 语言列表、默认语言、`localePath` / `switchLocalePath` / `alternates` 等路径工具 |
| `src/lib/collections-config.mjs` | 通用图鉴模块配置，每项都有 `nameEn` / `descEn` / `unitEn` / `labelEn` 等 |
| `src/data/site.json` | 站点与模块的显示名，含 `taglineEn` / `descriptionEn` / `nameEn` / `navNameEn` / `descEn` |
| `src/lib/content.js` | 页面统一从这里取本地化后的数据：`siteFor(locale)` / `listModules(locale)` / `moduleMap(locale)` / `href(locale, path)` |

**游戏内专有名词（鱼名、NPC 名、作物名）不翻译**，中英页面显示同一个名字 —— 避免造出游戏里不存在的译名。

### 英文内容现在到什么程度

| 范围 | 状态 |
| --- | --- |
| 页面结构、导航、面包屑、筛选与搜索、页脚、404、地图 UI | 全部英文 |
| 分类名称、季节、难度、单位、facts 标签、各版块标题 | 全部英文（走术语表） |
| meta title / description / H1 / JSON-LD | 按语言分别生成 |
| 鱼 / 昆虫 / 材料 / NPC / 地点 / 食谱 / 作物 | 结构化字段英文；wiki 原文本来就是英文的 `description` 直接沿用 |
| `money` / `beginner` 的攻略正文 | 仍是中文原创内容。英文页只展示语言无关的结构化数据 + 英文摘要，并给一条「English version in progress → Read the Chinese guide」提示与中文页链接 |

### 后续把 385 条内容逐步翻译成英文

不用改页面，只要往数据里补英文字段，构建后即可生效。推荐顺序：

1. **先补 `money.json`（16 条）和 `beginner.json`（16 条）**
   这两块正文是中文原创，英文页目前只能显示提示条，补上收益最大。要加的字段：
   `titleEn`、`summaryEn`、`requirementsEn[]`、`stepsEn[]`、`sectionsEn[{ heading, body }]`、`tipsEn[]`。
   页面已经在用 `pickText(locale, item.title, item.titleEn)` 这种取值方式，字段一出现就自动切到英文，
   「英文版整理中」的提示条会自动消失。
2. **再补各模块的 `tipsEn` / `descriptionEn`**
   `recipes.json`、`farming.json` 的 `tips` 是中文原创长文；`fish.json` 等的 `description` 也是中文。
   补上英文后英文页会优先用数据自带的英文原文（`englishProse()` 判定），没有才用结构化字段拼摘要。
3. **最后补 facts 的英文标签**（`wiki 原始季节`、`种子来源` 这类）。
   在 `src/i18n/data.mjs` 的 `TERMS` 里加一行映射即可，一次改动全站生效。

字段缺了就回退：英文页显示中文原名 + 英文结构信息，不会出现报错或空白页。
加完 JSON 跑 `npm run build`，`data:check` 会校验字段类型，`npm run seo:check` 会确认双语页面、
canonical 与 hreflang 都没问题。

---

## 两种页面模式

**1. 专用模块**（`cooking` / `fish` / `farming` / `money` / `beginner` / `map` / `codes`）
字段结构差异大，各有自己的列表页和详情页，可以自由定制表格、图表、地图等。

**2. 通用图鉴模块**（`bugs` / `materials` / `npcs` / `locations`）
字段结构统一（`slug / name / category / location / time / weather / level / price / description / facts / tips`），
共用 `src/pages/[locale]/[collection]/index.astro` 与 `[slug].astro` **两个页面文件**（两种语言共用同一份）。
新增这类模块不需要写任何页面代码。

### 新增一个通用图鉴模块（例如「鸟类图鉴」）

1. 在 `src/data/birds.json` 放数据（字段约定见 `src/lib/collections-config.mjs` 顶部注释）
2. 在 `src/lib/collections-config.mjs` 的 `collectionConfigs` 里加一条配置（`name` 配 `nameEn`、`desc` 配 `descEn` 等）
3. 在 `src/lib/content.js` 里 import 该 JSON，并加进 `collectionData`
4. 在 `src/data/site.json` 的 `modules` 里登记（决定导航、首页入口和页脚）

导航、首页卡片、页脚、中英两份搜索索引、数据校验、双语 sitemap、JSON-LD 都会自动带上它。

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

## SEO

所有 SEO 输出都由 `src/lib/seo.mjs` 统一生成，页面只负责把数据传进来。

### 每个页面都有什么

| 项目 | 说明 |
| --- | --- |
| `<title>` | 页面标题 + 站名后缀（`HeartopiaHub`），全站唯一，控制在 65 字以内，按语言分别生成 |
| meta description | 由结构化字段拼出的摘要，全站唯一，50 ~ 160 字，按语言分别生成 |
| `<h1>` | 每个页面恰好一个 |
| canonical | 由 `Astro.site` + 路径生成，强制带尾斜杠，**指向自身语言版本**；根路径 `/` 指向 `/en/`；404 指向首页 |
| meta robots | 可收录页 `index, follow, max-snippet:-1, max-image-preview:large`；404 与搜索页 `noindex, follow` |
| OG / Twitter Card | 含 `og:image` 尺寸与 alt、`og:locale` 与 `og:locale:alternate` |
| JSON-LD | WebSite + Organization + WebPage（CollectionPage / ItemPage）+ BreadcrumbList + 各页专属节点，节点用 `@id` 互相引用，并带 `inLanguage` |
| hreflang | 每个页面输出 `en`、`zh-CN` 两个姊妹链接 + `x-default` 指向英文版；`<html lang>` 跟着 URL 语言段走 |

页面级结构化数据：

- 首页：`ItemList`（11 个模块入口）+ `FAQPage`
- 分类页：`ItemList`，每条都带详情页链接，方便爬虫顺着抓
- 图鉴详情页：`Article` + `additionalProperty`（分类 / 地点 / 时间 / 天气 / 等级 / 售价 / facts）
- 食谱详情页：`Recipe`（含 `recipeIngredient`、`recipeInstructions`）
- 赚钱 / 新手详情页：`HowTo`（含 `step`、`supply`、`totalTime`）

### description 是怎么来的

`seo.mjs` 按模块 id 选择模板，所以 description 天然包含条目名，截断后依然唯一：

```js
catalogDescription(locale, collection, item)  // 通用图鉴：昆虫 / 材料 / NPC / 地点，以及后续新增模块
fishDescription(locale, item)                 // 鱼图鉴
recipeDescription(locale, item)               // 烹饪食谱
cropDescription(locale, item)                 // 种植攻略
moneyGuideDescription(locale, item)           // 赚钱攻略
beginnerGuideDescription(locale, item)        // 新手指南
```

模板按模块 id 分成 `{ zh, en }` 两套（`CATALOG_TEMPLATES`），术语和单位走 `src/i18n/data.mjs`。
中文用「，」收尾、英文用「, 」收尾，由 `sentence(locale, parts)` 统一处理。

新增一个通用图鉴模块时**不需要写文案代码**，会走 `genericCatalogDescription`。
想给新模块定制文案，在 `CATALOG_TEMPLATES` 里加一条即可。

### sitemap 与 robots

对外只需要认一个地址：**`/sitemap.xml`**（Search Console 提交地址、robots.txt 声明地址）。

- `@astrojs/sitemap` 生成 `sitemap-index.xml` + `sitemap-0.xml`（插件不支持改文件名），覆盖全部可收录页面，**中英两份 URL 都在里面**
- `scripts/build-sitemap-alias.mjs` 在 `astro build` 之后把分片合并成 `dist/sitemap.xml`，沿用插件的命名空间和 `<url>` 结构，所以不存在两套 URL 收集逻辑走偏的问题；分片数变化（页面涨过 `entryLimit`）也能自动跟上
- 每个 URL 都带 `xhtml:link` 语言互链，和页面上的 hreflang 一致
- 首页 `priority 1.0`，分类页 `0.8`，详情页 `0.6`（按去掉语言段后的路径深度计算，中英一致）
- `/en/search/`、`/zh/search/` 不进 sitemap（纯前端工具页，内容由查询参数决定）
- 根路径 `/` 不进 sitemap（它是 `/en/` 的副本，canonical 已经指过去了）
- sitemap 里不含 404 页面（`@astrojs/sitemap` 会跳过状态码页，自检也会复查一遍）
- `robots.txt` 由 `src/pages/robots.txt.ts` 生成：`Allow: /` 放行全站、`Disallow: /*?q=` 挡住搜索参数页、声明 `Sitemap: <site>/sitemap.xml`

### 域名只有一个来源

`astro.config.mjs` 的 `site` 优先取环境变量 `SITE_URL`，否则取 `src/data/site.json` 的 `url`（当前是 `https://heartopia-guide-cwx.pages.dev`）。
canonical、sitemap、robots、JSON-LD 全部跟着它走，**换域名时改环境变量即可，不用改代码**。
换成自定义域名后记得在 Cloudflare Pages 里配 `SITE_URL` 并重新部署，否则 canonical 会指向旧的 `pages.dev` 地址。

### 自检

```bash
npm run build && npm run seo:check
```

`check-seo.mjs` 直接扫描 `dist/`，检查：

- title / description / canonical / H1 是否齐全且唯一（同语言之间比对，长度按实体解码后计算）
- `<html lang>` 是否和 URL 语言段一致
- hreflang 是否 `en` + `zh-CN` + `x-default` 三件套齐全、指向正确、且对应的姊妹页面真的构建出来了
- JSON-LD 能否解析、noindex 页面有没有混进 sitemap、sitemap 是否覆盖所有可收录页面并带语言互链
- 两种语言生成的页面数量是否一致，robots 是否声明 sitemap

- 是否有 404 / 测试页 / 重复页混进 sitemap，sitemap 是否覆盖全部可收录页面
- `dist/sitemap.xml` 是否生成、URL 数量是否和分片一致、是否带 `xhtml` 命名空间与语言互链
- `robots.txt` 声明的 sitemap 是否本站地址、对应文件是否真的存在、有没有整站屏蔽规则

有问题会以非 0 退出。`npm run build` 已经包含这一步（末尾会跑 `sitemap.xml` 合并），
想单独跑就 `npm run seo:check`；想放进 CI 的话把 `npm run seo:check` 接到 `npm run build` 后面即可。

### 接入 Google Search Console

不需要改代码，两步：

1. **验证域名所有权**（任选一种）
   - HTML 标记（推荐，已内置支持）：把 Search Console 给的真实验证码填进 `src/data/site.json` 的
     `googleSiteVerification` 字段，重新构建部署，`BaseLayout.astro` 会自动输出
     `<meta name="google-site-verification" content="...">`
   - 或者用 Cloudflare Pages 的 DNS 验证方式，不碰代码
   留空时不会输出该 meta 标签，**项目里不存在任何占位或伪造的验证码**。
2. **提交 sitemap**：在 Search Console 的「站点地图」里填 `sitemap.xml`，
   完整地址是 `https://heartopia-guide-cwx.pages.dev/sitemap.xml`。
   Robots 文件里也已经声明了同一个地址，Google 会自己发现它。

本项目**没有**接入 Google Analytics 或任何第三方统计脚本，这一步只配置 Search Console 需要的内容。

### 已知的 SEO 缺口

- `og-default.svg` 是矢量图，部分社交平台不解析 SVG 缩略图；需要更好的分享卡片时换一张 1200×630 的 PNG
- 英文站目前复用了中文站的数据字段，`money` / `beginner` 的正文还是中文（见上一节「后续把 385 条内容逐步翻译成英文」）
- 食谱与鱼类没有图片素材，所以 `Recipe` 里没写 `image`，拿不到 Google 食谱富媒体结果
- 数据里没有可靠的发布时间，因此 JSON-LD 里刻意不写 `datePublished` / `dateModified`，避免用假日期
- 站点目前跑在 `*.pages.dev` 子域上，Search Console 验证和收录都正常，但绑自定义域名对长期权重更友好
- 没有接入 Google Analytics；Search Console 的流量数据够用，需要更细的行为分析时再单独加

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
   | `SITE_URL` | 正式域名（当前 `https://heartopia-guide-cwx.pages.dev`），用于 canonical、sitemap、robots。不设则退回 `src/data/site.json` 的 `url` |

5. 换自定义域名后，把 `SITE_URL` 或者 `src/data/site.json` 的 `url` 改成新域名再重新部署一次，
   否则 canonical / sitemap / robots 还会指向旧的 `pages.dev` 地址。

双语不需要在托管平台做任何额外配置：**不要**配 `/zh/` 或 `/en/` 的跳转规则，
语言分流由根路径的几行内联脚本完成，`/en/`、`/zh/` 都是真实存在的静态目录。

任何静态托管都可以：Vercel、Netlify、GitHub Pages、对象存储 + CDN，产物就是 `dist/`。

---

## MVP 范围与后续

已跑通：11 个模块的列表页与详情页、关键词搜索 + 标签筛选、导航即时搜索、互动地图、SEO 元信息、
中英双语路由与手动切换、hreflang、双语 sitemap（`/sitemap.xml` 统一入口）、404、移动端导航、数据校验、
Search Console 所需的验证位与 sitemap 提交地址。

刻意留白：后台管理、数据库、登录、评论、用户收藏。数据量继续增长后如果手写 JSON 变慢，再考虑 CSV → JSON 脚本或 Headless CMS，页面层不需要改。

## 内容声明

本站是非官方社区攻略站，与 Heartopia 官方无关联。数据由社区整理，可能随版本变动，请以游戏内为准。
