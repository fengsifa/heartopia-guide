/**
 * 通用图鉴模块配置。
 *
 * 这里定义的模块共用同一套列表页 / 详情页组件（src/pages/[collection]/...），
 * 新增一个通用图鉴模块只需要：
 *   1. 增加一条配置
 *   2. 在 src/data 下放同名 JSON 数据文件
 *   3. 在 src/lib/content.js 里 import 该 JSON
 *   4. 在 src/data/site.json 的 modules 里登记（决定导航与首页入口）
 * 页面文件、搜索索引、数据校验都会自动带上它。
 *
 * 数据字段约定（缺字段请给空数组或空字符串，不要省略）：
 *   slug        唯一标识，决定详情页网址
 *   name        显示名称
 *   category    分类，可用于筛选
 *   location    数组，出没地点
 *   time        数组，出现时间
 *   weather     数组，天气条件
 *   level       字符串，等级要求
 *   price       数字，售价（0 表示未记录）
 *   description 一句话简介
 *   facts       数组 [{ label, value }] 模块自己的补充字段
 *   tips        数组，攻略提示
 */
export const collectionConfigs = [
  {
    id: 'bugs',
    dataFile: 'bugs.json',
    name: '昆虫图鉴',
    icon: '🦋',
    path: '/bugs/',
    desc: '出没地点、时间、天气与售价',
    unit: '种昆虫',
    placeholder: '搜索昆虫名，例如 Beetle、Butterfly…',
    searchLabel: '搜索昆虫',
    filters: [
      { key: 'location', label: '地点' },
      { key: 'time', label: '时间' },
      { key: 'weather', label: '天气' }
    ],
    notes: [
      '昆虫售价与稀有度差异很大，出现条件由「地点 + 时间 + 天气」共同决定。',
      '抓虫前先确认天气，Rainbow 天气通常能遇到更高价值的种类。',
      '等级不足时部分昆虫不会刷新，优先提升采集等级。'
    ]
  },
  {
    id: 'materials',
    dataFile: 'materials.json',
    name: '材料图鉴',
    icon: '🧺',
    path: '/materials/',
    desc: '获取方式、用途与售价',
    unit: '种材料',
    placeholder: '搜索材料名，例如 Wood、Walnut…',
    searchLabel: '搜索材料',
    filters: [],
    notes: [
      '材料主要用于烹饪、制作台合成和任务交付，建议家里常备一批常用材料。',
      '价格未知的材料多半是任务或合成专用，不一定要卖。'
    ]
  },
  {
    id: 'npcs',
    dataFile: 'npcs.json',
    name: 'NPC 图鉴',
    icon: '🧑',
    path: '/npcs/',
    desc: '身份、生日、喜好与常驻位置',
    unit: '位 NPC',
    placeholder: '搜索 NPC 名字或身份…',
    searchLabel: '搜索 NPC',
    filters: [
      { key: 'category', label: '身份' },
      { key: 'location', label: '地点' }
    ],
    notes: [
      '送出 NPC 喜欢的礼物可以更快提升好感度，好感度会解锁配方与商店折扣。',
      '生日当天送礼有额外加成，记得提前准备礼物。',
      'NPC 会随时间在镇内移动，位置以常见出没点为准。'
    ]
  },
  {
    id: 'locations',
    dataFile: 'locations.json',
    name: '地点图鉴',
    icon: '🏪',
    path: '/locations/',
    desc: '商店位置、营业时间与负责人',
    unit: '个地点',
    placeholder: '搜索地点名，例如 Store、Plaza…',
    searchLabel: '搜索地点',
    filters: [
      { key: 'category', label: '类型' },
      { key: 'location', label: '所在区域' }
    ],
    notes: [
      '商店有固定营业时间，关门后无法交易，出门采购前先看一眼时间。',
      '城镇中心（Central Plaza）聚集了大多数商店，跑一趟可以一次买齐。',
      '部分商店由特定 NPC 经营，好感度提升后可能解锁额外商品。'
    ]
  }
];

export function listCollectionIds() {
  return collectionConfigs.map(function (config) { return config.id; });
}
