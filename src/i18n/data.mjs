/**
 * 数据字段的本地化。
 *
 * 数据文件保持一份，语言差异在这里收口：
 *   1. 闭集术语（料理分类、季节、地图区域、facts 标签）走 TERMS 精确映射
 *   2. 带单位的自由文本（「恢复 100 体力」「12 小时」）走 UNIT_PATTERNS 做机械替换
 *   3. 作者原创的中文长文（攻略正文、tips）不在英文页里编造，
 *      由 hasEnglishProse() 判断后交给页面显示「英文版整理中」并链接到中文页
 *
 * 原则：只翻译术语和单位，不生成数据里没有的事实。
 */
import { listSeparator } from './config.mjs';

// 闭集术语表：中文原文 → 英文
export const TERMS = {
  // 料理分类
  '其他料理': 'Other Dishes',
  '灶台料理': 'Stove Dishes',
  '主食': 'Main Dishes',
  '海鲜': 'Seafood',
  '甜点': 'Desserts',
  '汤': 'Soups',
  '饮品': 'Drinks',
  '企鹅灶台料理': 'Penguin Stove Dishes',
  // 作物季节 / 类型
  '每日': 'Daily',
  '未标注': 'Not specified',
  '秋季': 'Autumn',
  '春季': 'Spring',
  '全年': 'All year',
  '作物': 'Crops',
  '蔬菜': 'Vegetables',
  '花卉': 'Flowers',
  // 生长时间里的不规则写法
  '1-2 天（需浇水）': '1-2 days (needs watering)',
  '约几天（需每天浇水，雨天免浇）': 'A few days (water daily; no watering on rainy days)',
  '1 天以上（可多次生长）': 'Over 1 day (regrows multiple times)',
  '每天播种浇水，次日起可收获': 'Sow and water daily; harvestable the next day',
  // 解锁条件
  '初始': 'Starter',
  // 地图区域
  '温泉山': 'Onsen Mountain',
  '森林': 'Forest',
  '渔村': 'Fishing Village',
  '海湾': 'Bay',
  '湖泊': 'Lake',
  '河流': 'River',
  '郊区与家园': 'Suburbs & Home',
  '活动限定': 'Event Only',
  // 地图分类
  '钓鱼点': 'Fishing Spots',
  '昆虫点': 'Bug Spots',
  '商店与地标': 'Shops & Landmarks',
  '昆虫': 'Bug',
  '地点': 'Location',
  '材料': 'Material',
  // 赚钱难度 / 新手分类
  '简单': 'Easy',
  '中等': 'Medium',
  '困难': 'Hard',
  '极难': 'Very hard',
  '开局': 'Opening',
  '养成': 'Progression',
  '帮助': 'Help',
  '探索': 'Exploration',
  '日常': 'Daily Routine',
  '玩法': 'Gameplay',
  '系统': 'Systems',
  // facts 标签
  '出现等级': 'Spawn Level',
  '天气': 'Weather',
  '获取方式': 'How to Obtain',
  '喜好': 'Likes',
  '生日': 'Birthday',
  '所在区域': 'Area',
  '营业时间': 'Hours',
  '负责人': 'Owner',
  '售价': 'Price',
  '分类': 'Category',
  '出没地点': 'Location',
  '出现时间': 'Time',
  '等级要求': 'Level',
  '体型': 'Size',
  '季节': 'Season',
  '上钩难度': 'Difficulty',
  '单次净利润': 'Profit per harvest',
  '理论日收益': 'Theoretical daily profit',
  '复收': 'Regrows',
  '解锁等级': 'Unlock level',
  '每格净赚': 'Profit per tile',
  // 通用值
  '未知': 'Unknown',
  '不限': 'Any',
  '全天': 'All day',
  '未记录': 'Not recorded',
  '无': 'None',
  '可用': 'Active',
  '限时': 'Limited',
  '已过期': 'Expired',
  '已验证': 'Verified',
  '是': 'Yes',
  '否': 'No',
  '可复收': 'Regrows',
  '一次性': 'One-time',
  '无限制': 'None'
};

// 带单位的自由文本
const UNIT_PATTERNS = [
  [/([0-9][0-9,.]*)\s*金币/g, '$1 Gold'],
  [/金币/g, 'Gold'],
  [/([0-9][0-9,.]*)\s*体力/g, '$1 Stamina'],
  [/体力/g, 'Stamina'],
  [/每天/g, 'daily '],
  [/([0-9][0-9,.]*)\s*小时/g, '$1 hours'],
  [/([0-9][0-9,.]*)\s*分钟/g, '$1 min'],
  [/([0-9][0-9,.]*)\s*秒/g, '$1s'],
  [/([0-9][0-9,.]*)\s*天/g, '$1 days'],
  [/恢复\s*([0-9]+)\s*Stamina/g, 'Restores $1 Stamina'],
  [/烹饪等级\s*([0-9]+)/g, 'Cooking Level $1'],
  [/厨房\s*([0-9]+)\s*级/g, 'Kitchen Level $1'],
  [/加成\s*/g, 'bonus: '],
  [/钓鱼加成\s*([0-9]+)\s*min/g, 'Fishing bonus for $1 min'],
  [/采集加成\s*([0-9]+)\s*min/g, 'Foraging bonus for $1 min'],
  [/移速\s*([0-9]+)\s*min/g, 'Movement speed for $1 min'],
  [/\s*\|\s*/g, '-'],
  [/\s*·\s*/g, ' · ']
];

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/** 只处理 ASCII 字符串：数据里原生的英文正文（例如 wiki 导入的 description） */
export function isEnglish(value) {
  const text = String(value == null ? '' : value);
  if (!text.trim()) return false;
  return !/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(text);
}

/**
 * 拿数据自带的英文正文。
 * 有就返回（这些是 wiki 原文，不是我们编的），没有返回空串。
 */
export function englishProse(value) {
  if (Array.isArray(value)) {
    const list = value.filter(function (entry) { return isEnglish(entry); });
    return list.length === value.length && list.length ? list.join(' ') : '';
  }
  return isEnglish(value) ? String(value).trim() : '';
}

/** 单个值：中文原样返回，英文走术语表 + 单位替换 */
export function localizeValue(locale, value) {
  if (value == null) return '';
  if (locale === 'zh') return String(value);
  const text = String(value).trim();
  if (!text) return '';
  if (isEnglish(text)) return text;
  if (Object.prototype.hasOwnProperty.call(TERMS, text)) return TERMS[text];

  let result = text;
  UNIT_PATTERNS.forEach(function (entry) {
    result = result.replace(entry[0], entry[1]);
  });
  // 中文顿号换成英文逗号，顺手清掉多余空格
  return result
    .replace(/、/g, ', ')
    .replace(/，/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 数组或单值，统一按目标语言的分隔符输出 */
export function localizeList(locale, value) {
  if (Array.isArray(value)) {
    const list = value
      .map(function (entry) { return localizeValue(locale, entry); })
      .filter(Boolean);
    return list.join(listSeparator(locale));
  }
  return localizeValue(locale, value);
}

/** facts：标签和值都本地化 */
export function localizeFacts(locale, facts) {
  if (!Array.isArray(facts)) return [];
  return facts
    .filter(function (fact) { return fact && fact.label; })
    .map(function (fact) {
      return {
        label: localizeValue(locale, fact.label),
        value: localizeList(locale, fact.value)
      };
    });
}

/**
 * 通用图鉴条目：返回一份可以直接渲染的本地化副本。
 * 只有名称在所有语言下保持一致（游戏内物品名，不做翻译）。
 */
export function localizeCatalogItem(locale, item) {
  return Object.assign({}, item, {
    category: locale === 'zh' ? item.category : localizeValue(locale, item.category) || item.category,
    location: item.location,
    time: item.time,
    weather: item.weather,
    facts: localizeFacts(locale, item.facts),
    // 英文页优先用数据自带的英文正文；没有就交给页面用结构化字段生成
    prose: locale === 'zh' ? '' : englishProse(item.description)
  });
}

/** 中文字段优先、英文字段兜底，用于 codes 这类手工补齐的双语条目 */
export function pickText(locale, zhValue, enValue) {
  if (locale === 'zh') return zhValue;
  if (enValue === undefined || enValue === null || enValue === '') return zhValue;
  return enValue;
}
