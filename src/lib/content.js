import site from '../data/site.json';
import codes from '../data/codes.json';
import recipes from '../data/recipes.json';
import fish from '../data/fish.json';
import money from '../data/money.json';
import beginner from '../data/beginner.json';
import mapData from '../data/map.json';
import farming from '../data/farming.json';
import bugs from '../data/bugs.json';
import materials from '../data/materials.json';
import npcs from '../data/npcs.json';
import locations from '../data/locations.json';
import { collectionConfigs, listCollectionIds } from './collections-config.mjs';
import { localePath } from '../i18n/config.mjs';
import { localizeValue, localizeList } from '../i18n/data.mjs';

export const siteInfo = site;
export const codesList = codes;
export const recipesList = recipes;
export const fishList = fish;
export const moneyList = money;
export const beginnerList = beginner;
export const mapInfo = mapData;
export const farmingList = farming;
export const bugsList = bugs;
export const materialsList = materials;
export const npcsList = npcs;
export const locationsList = locations;

export const moduleMeta = {};
site.modules.forEach(function (item) {
  moduleMeta[item.id] = item;
});

// 通用图鉴模块：配置 + 数据，共用 src/pages/[collection] 下的页面
const collectionData = {
  bugs: bugs,
  materials: materials,
  npcs: npcs,
  locations: locations
};

export const collections = collectionConfigs.map(function (config) {
  return Object.assign({}, config, { items: collectionData[config.id] || [] });
});

export function listCollections() {
  return collections;
}

export function getCollection(id) {
  return collections.filter(function (collection) { return collection.id === id; })[0];
}

export { collectionConfigs, listCollectionIds };

export const moduleCounts = {
  codes: codesList.length,
  cooking: recipesList.length,
  fish: fishList.length,
  money: moneyList.length,
  beginner: beginnerList.length,
  map: mapInfo.markers.length,
  farming: farmingList.length
};
collections.forEach(function (collection) {
  moduleCounts[collection.id] = collection.items.length;
});

export const moduleUnits = {
  codes: '个兑换码',
  cooking: '道食谱',
  fish: '种鱼',
  money: '篇攻略',
  beginner: '篇指南',
  map: '个标记点',
  farming: '种作物'
};
collections.forEach(function (collection) {
  moduleUnits[collection.id] = collection.unit;
});

export function formatNumber(value) {
  const number = Number(value || 0);
  return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function uniqueValues(list, key) {
  const set = new Set();
  list.forEach(function (item) {
    const value = item[key];
    if (Array.isArray(value)) {
      value.forEach(function (entry) { if (entry) set.add(entry); });
    } else if (value) {
      set.add(value);
    }
  });
  return Array.from(set).sort();
}

export function sortByPrice(list) {
  return list.slice().sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
}

export const fishFilters = {
  locations: uniqueValues(fishList, 'location'),
  times: uniqueValues(fishList, 'time'),
  weather: uniqueValues(fishList, 'weather'),
  sizes: uniqueValues(fishList, 'size')
};

export const recipeCategories = uniqueValues(recipesList, 'category');
export const cropSeasons = uniqueValues(farmingList, 'season');

// 把「2 小时 / 30 分钟 / 3 天」这类生长时间统一换算成分钟，无法换算时返回 0
export function growthMinutes(text) {
  const value = String(text || '');
  const days = value.match(/([0-9]+(?:\.[0-9]+)?)\s*天/);
  if (days) return Number(days[1]) * 1440;
  const hours = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:小时|時|时|hours?|hrs?)/i);
  if (hours) return Number(hours[1]) * 60;
  const minutes = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:分钟|分|mins?|minutes?)/i);
  if (minutes) return Number(minutes[1]);
  return 0;
}

// 理论日收益：按一天内反复收获计算，生长时间不可换算时退化为单次净赚
export function profitPerDay(item) {
  const minutes = growthMinutes(item.growthTime);
  const profit = Number(item.profit || 0);
  if (minutes <= 0) return profit;
  return Math.round((profit * 1440) / minutes);
}

export function regrowLabel(value) {
  if (value === true) return '可复收';
  if (value === false) return '一次性';
  return '未标注';
}

/** 复收状态按语言输出；'可复收' / '一次性' / '未标注' 都在术语表里 */
export function regrowLabelFor(locale, value) {
  return localizeValue(locale, regrowLabel(value));
}

export function joinList(value) {
  if (Array.isArray(value)) return value.length ? value.join('、') : '不限';
  return value || '不限';
}

// 列表页 / 详情页共用的字段取值工具
export function toAttr(value) {
  if (Array.isArray(value)) return value.join('|');
  return value == null ? '' : String(value);
}

export function toText(value) {
  if (Array.isArray(value)) return value.length ? value.join('、') : '';
  return value == null ? '' : String(value);
}

/* ------------------------------------------------------------------ *
 * 多语言访问层
 *
 * 数据文件只有一份，这里按 locale 挑中文字段或英文字段。
 * 页面统一用 listModules / listCollectionsFor / siteFor / moduleUnitsFor，
 * 不要再直接读 siteInfo.modules 里的中文字段。
 * ------------------------------------------------------------------ */

function pick(locale, zhValue, enValue) {
  if (locale === 'zh') return zhValue;
  if (enValue === undefined || enValue === null || enValue === '') return zhValue;
  return enValue;
}

/** 站点信息（本地化） */
export function siteFor(locale) {
  return {
    name: site.name,
    tagline: pick(locale, site.tagline, site.taglineEn),
    description: pick(locale, site.description, site.descriptionEn),
    url: site.url
  };
}

/** 模块列表（本地化）；path 不含语言前缀，链接请用 href() */
export function listModules(locale) {
  return site.modules.map(function (mod) {
    return {
      id: mod.id,
      icon: mod.icon,
      path: mod.path,
      name: pick(locale, mod.name, mod.nameEn),
      navName: pick(locale, mod.navName, mod.navNameEn),
      desc: pick(locale, mod.desc, mod.descEn)
    };
  });
}

export function moduleMap(locale) {
  const map = {};
  listModules(locale).forEach(function (mod) { map[mod.id] = mod; });
  return map;
}

/** 通用图鉴模块（本地化） */
export function listCollectionsFor(locale) {
  return collectionConfigs.map(function (config) {
    return {
      id: config.id,
      icon: config.icon,
      path: config.path,
      name: pick(locale, config.name, config.nameEn),
      desc: pick(locale, config.desc, config.descEn),
      unit: pick(locale, config.unit, config.unitEn),
      placeholder: pick(locale, config.placeholder, config.placeholderEn),
      searchLabel: pick(locale, config.searchLabel, config.searchLabelEn),
      notes: pick(locale, config.notes, config.notesEn) || [],
      filters: (config.filters || []).map(function (filter) {
        return { key: filter.key, label: pick(locale, filter.label, filter.labelEn) };
      }),
      items: collectionData[config.id] || []
    };
  });
}

export function getCollectionFor(locale, id) {
  return listCollectionsFor(locale).filter(function (collection) { return collection.id === id; })[0];
}

const MODULE_UNITS_EN = {
  codes: 'codes',
  cooking: 'recipes',
  fish: 'fish',
  money: 'routes',
  beginner: 'guides',
  map: 'markers',
  farming: 'crops',
  bugs: 'bugs',
  materials: 'materials',
  npcs: 'NPCs',
  locations: 'locations'
};

/** 各模块的计数单位（本地化） */
export function moduleUnitsFor(locale) {
  const units = {};
  Object.keys(moduleUnits).forEach(function (id) {
    units[id] = pick(locale, moduleUnits[id], MODULE_UNITS_EN[id]);
  });
  return units;
}

/** 站内链接统一加语言前缀：href('en', '/fish/') → /en/fish/ */
export function href(locale, path) {
  return localePath(locale, path);
}

export { localizeValue, localizeList };
