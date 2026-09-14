/**
 * 通用图鉴模块配置。
 *
 * 这里定义的模块共用同一套列表页 / 详情页组件（src/pages/[locale]/[collection]/...），
 * 新增一个通用图鉴模块只需要：
 *   1. 增加一条配置（中英文字段都要写）
 *   2. 在 src/data 下放同名 JSON 数据文件
 *   3. 在 src/lib/content.js 里 import 该 JSON
 *   4. 在 src/data/site.json 的 modules 里登记（决定导航与首页入口）
 * 页面文件、搜索索引、数据校验都会自动带上它。
 *
 * 双语约定：所有展示文案都成对出现 —— name / nameEn、desc / descEn、unit / unitEn、
 * placeholder / placeholderEn、searchLabel / searchLabelEn、notes / notesEn、
 * filters[].label / filters[].labelEn。缺 En 字段会回退到中文，不会报错。
 *
 * 数据字段约定（缺字段请给空数组或空字符串，不要省略）：
 *   slug        唯一标识，决定详情页网址
 *   name        显示名称（游戏内专有名词，中英一致，不做翻译）
 *   category    分类，可用于筛选
 *   location    数组，出没地点
 *   time        数组，出现时间
 *   weather     数组，天气条件
 *   level       字符串，等级要求
 *   price       数字，售价（0 表示未记录）
 *   description 一句话简介（中文；英文页会优先用数据自带的英文原文，没有则由结构化字段生成）
 *   facts       数组 [{ label, value }] 模块自己的补充字段
 *   tips        数组，攻略提示（中文原创长文，英文页不复制）
 */
export const collectionConfigs = [
  {
    id: 'bugs',
    dataFile: 'bugs.json',
    name: '昆虫图鉴',
    nameEn: 'Bug Database',
    icon: '🦋',
    path: '/bugs/',
    desc: '出没地点、时间、天气与售价',
    descEn: 'Spawn location, time, weather and price',
    unit: '种昆虫',
    unitEn: 'bugs',
    placeholder: '搜索昆虫名，例如 Beetle、Butterfly…',
    placeholderEn: 'Search a bug, e.g. Beetle, Butterfly…',
    searchLabel: '搜索昆虫',
    searchLabelEn: 'Search bugs',
    filters: [
      { key: 'location', label: '地点', labelEn: 'Location' },
      { key: 'time', label: '时间', labelEn: 'Time' },
      { key: 'weather', label: '天气', labelEn: 'Weather' }
    ],
    notes: [
      '昆虫售价与稀有度差异很大，出现条件由「地点 + 时间 + 天气」共同决定。',
      '抓虫前先确认天气，Rainbow 天气通常能遇到更高价值的种类。',
      '等级不足时部分昆虫不会刷新，优先提升采集等级。'
    ],
    notesEn: [
      'Bug prices vary widely with rarity, and spawn conditions come down to location, time and weather together.',
      'Check the weather before heading out — rainbow weather usually brings higher-value species.',
      'Some bugs will not spawn below a certain level, so level up gathering first.'
    ]
  },
  {
    id: 'materials',
    dataFile: 'materials.json',
    name: '材料图鉴',
    nameEn: 'Material Database',
    icon: '🧺',
    path: '/materials/',
    desc: '获取方式、用途与售价',
    descEn: 'How to obtain, uses and price',
    unit: '种材料',
    unitEn: 'materials',
    placeholder: '搜索材料名，例如 Wood、Walnut…',
    placeholderEn: 'Search a material, e.g. Wood, Walnut…',
    searchLabel: '搜索材料',
    searchLabelEn: 'Search materials',
    filters: [],
    notes: [
      '材料主要用于烹饪、制作台合成和任务交付，建议家里常备一批常用材料。',
      '价格未知的材料多半是任务或合成专用，不一定要卖。'
    ],
    notesEn: [
      'Materials feed cooking, crafting station recipes and quest turn-ins, so keep a stack of the common ones at home.',
      'Materials with no recorded price are usually quest or crafting specific — you do not have to sell them.'
    ]
  },
  {
    id: 'npcs',
    dataFile: 'npcs.json',
    name: 'NPC 图鉴',
    nameEn: 'NPC Database',
    icon: '🧑',
    path: '/npcs/',
    desc: '身份、生日、喜好与常驻位置',
    descEn: 'Role, birthday, likes and usual location',
    unit: '位 NPC',
    unitEn: 'NPCs',
    placeholder: '搜索 NPC 名字或身份…',
    placeholderEn: 'Search an NPC name or role…',
    searchLabel: '搜索 NPC',
    searchLabelEn: 'Search NPCs',
    filters: [
      { key: 'category', label: '身份', labelEn: 'Role' },
      { key: 'location', label: '地点', labelEn: 'Location' }
    ],
    notes: [
      '送出 NPC 喜欢的礼物可以更快提升好感度，好感度会解锁配方与商店折扣。',
      '生日当天送礼有额外加成，记得提前准备礼物。',
      'NPC 会随时间在镇内移动，位置以常见出没点为准。'
    ],
    notesEn: [
      'Gifting an NPC something they like raises friendship faster, and friendship unlocks recipes and shop discounts.',
      'Birthday gifts get a bonus, so prepare the present ahead of time.',
      'NPCs move around town during the day, so treat listed spots as where you will usually find them.'
    ]
  },
  {
    id: 'locations',
    dataFile: 'locations.json',
    name: '地点图鉴',
    nameEn: 'Location Database',
    icon: '🏪',
    path: '/locations/',
    desc: '商店位置、营业时间与负责人',
    descEn: 'Shop locations, opening hours and owners',
    unit: '个地点',
    unitEn: 'locations',
    placeholder: '搜索地点名，例如 Store、Plaza…',
    placeholderEn: 'Search a location, e.g. Store, Plaza…',
    searchLabel: '搜索地点',
    searchLabelEn: 'Search locations',
    filters: [
      { key: 'category', label: '类型', labelEn: 'Type' },
      { key: 'location', label: '所在区域', labelEn: 'Area' }
    ],
    notes: [
      '商店有固定营业时间，关门后无法交易，出门采购前先看一眼时间。',
      '城镇中心（Central Plaza）聚集了大多数商店，跑一趟可以一次买齐。',
      '部分商店由特定 NPC 经营，好感度提升后可能解锁额外商品。'
    ],
    notesEn: [
      'Shops keep fixed hours and will not trade once closed, so check the clock before heading out.',
      'Most shops cluster around Central Plaza, so a single trip can cover several errands.',
      'Some shops are run by a specific NPC, and higher friendship may unlock extra stock.'
    ]
  }
];

export function listCollectionIds() {
  return collectionConfigs.map(function (config) { return config.id; });
}

/** 按语言取展示文案，缺 En 字段回退中文 */
export function collectionText(locale, config, field) {
  if (locale === 'zh') return config[field];
  const enKey = field + 'En';
  return config[enKey] !== undefined ? config[enKey] : config[field];
}
