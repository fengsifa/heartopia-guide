/**
 * 从 heartopiawiki.com 的 Cargo API 导入结构化数据到 src/data/。
 *
 * 用法：
 *   node scripts/import-wiki.mjs            # 导入全部支持的模块
 *   node scripts/import-wiki.mjs bugs       # 只导入指定模块
 *
 * 说明：
 * - 会覆盖 bugs.json / materials.json / npcs.json
 * - recipes.json 采用「合并」策略：手工整理的条目（source 不是 wiki）会保留，
 *   只替换上一次从 wiki 导入的条目
 * - 导出的字段会做清洗：去掉 HTML、wikitext 标记、Unknown 占位值
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'src', 'data');
const API = 'https://heartopiawiki.com/api.php';

async function request(params, tries = 4) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const url = API + '?' + new URLSearchParams(params);
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const text = await res.text();
      if (!text.startsWith('{')) throw new Error('返回值不是 JSON');
      const data = JSON.parse(text);
      if (data.error) throw new Error(JSON.stringify(data.error).slice(0, 120));
      return data;
    } catch (error) {
      if (attempt === tries - 1) throw new Error('请求失败：' + error.message);
      await new Promise(function (resolve) { setTimeout(resolve, 1500); });
    }
  }
  return {};
}

async function fetchTable(table) {
  const fieldsRes = await request({ action: 'cargofields', table: table, format: 'json' });
  const fieldNames = Object.keys(fieldsRes.cargofields || {});
  const fields = ['_pageName=Page'].concat(fieldNames).join(',');
  const rows = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const data = await request({
      action: 'cargoquery', tables: table, fields: fields,
      format: 'json', limit: '500', offset: String(offset)
    });
    const batch = (data.cargoquery || []).map(function (row) { return row.title; });
    rows.push.apply(rows, batch);
    if (batch.length < 500) break;
  }
  return rows;
}

/* ---------- 清洗工具 ---------- */

function cleanText(value) {
  let text = String(value == null ? '' : value);
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\[\[File:[^\]]*\]\]/gi, ' ');
  text = text.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1');
  text = text.replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/&ndash;/gi, '-');
  return text.replace(/\s+/g, ' ').trim();
}

function isUnknown(value) {
  const text = cleanText(value).toLowerCase();
  return text === '' || text === 'unknown' || text === 'unkown' || text === 'n/a'
    || text === 'none' || text === '-' || text === '?';
}

function cleanList(value) {
  const parts = cleanText(value).split(',');
  const seen = [];
  parts.forEach(function (part) {
    const item = part.trim();
    if (!item || isUnknown(item)) return;
    if (seen.indexOf(item) === -1) seen.push(item);
  });
  return seen.sort();
}

function toNumber(value) {
  const matched = cleanText(value).match(/-?\d[\d,]*/);
  if (!matched) return 0;
  const num = Number(matched[0].replace(/,/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function slugify(name) {
  const base = cleanText(name).toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'entry';
}

function uniqueSlugs(names) {
  const used = new Set();
  const slugs = [];
  names.forEach(function (name) {
    const base = slugify(name);
    let slug = base;
    let index = 2;
    while (used.has(slug)) { slug = base + '-' + index; index += 1; }
    used.add(slug);
    slugs.push(slug);
  });
  return slugs;
}

function dedupeByName(rows) {
  const map = new Map();
  rows.forEach(function (row) {
    const name = cleanText(row.Name || row.Page);
    if (!name || isUnknown(name)) return;
    if (!map.has(name)) map.set(name, row);
  });
  return Array.from(map.values());
}

function writeJson(name, value) {
  writeFileSync(join(dataDir, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

/* ---------- 各模块转换 ---------- */

// wiki 里少数「地点」其实是活动道具名，统一归到「活动限定」，避免筛选器出现噪音
const LOCATION_ALIAS = {
  'Bait the Insects Event': 'Event only',
  'Inflatable Insect Attractor Specialty': 'Event only'
};

function normalizeLocations(list) {
  const mapped = list.map(function (entry) { return LOCATION_ALIAS[entry] || entry; });
  return Array.from(new Set(mapped)).sort();
}

function buildBugs(rows) {
  const list = dedupeByName(rows);
  const slugs = uniqueSlugs(list.map(function (row) { return cleanText(row.Name); }));
  return list.map(function (row, index) {
    const name = cleanText(row.Name);
    const location = normalizeLocations(cleanList(row.Location));
    const time = cleanList(row.Time);
    const weather = cleanList(row.Weather);
    const level = isUnknown(row.Level) ? '' : cleanText(row.Level);
    const price = toNumber(row.Price);
    const place = location.length ? location.join('、') : '未知区域';
    const when = time.length ? time.join('、') : '全天';
    const facts = [];
    if (level) facts.push({ label: '出现等级', value: level });
    if (weather.length) facts.push({ label: '天气', value: weather.join('、') });
    const tips = [];
    tips.push('推荐在' + when + '前往' + place + '寻找。');
    if (weather.length) tips.push('天气条件：' + weather.join('、') + '。');
    tips.push('售价约 ' + price + ' 金币，属于收集图鉴的一部分。');
    return {
      slug: slugs[index],
      name: name,
      category: '昆虫',
      location: location,
      time: time,
      weather: weather,
      level: level,
      price: price,
      description: isUnknown(row.Description)
        ? name + ' 是 Heartopia 中的一种昆虫，出没于' + place + '，售价约 ' + price + ' 金币。'
        : cleanText(row.Description),
      facts: facts,
      tips: tips
    };
  }).sort(function (a, b) { return b.price - a.price || a.name.localeCompare(b.name); });
}

function buildMaterials(rows) {
  const list = dedupeByName(rows);
  const slugs = uniqueSlugs(list.map(function (row) { return cleanText(row.Name); }));
  return list.map(function (row, index) {
    const name = cleanText(row.Name);
    const price = toNumber(row.Price);
    const source = isUnknown(row.Source) ? '' : cleanText(row.Source);
    const facts = [];
    if (source) facts.push({ label: '获取方式', value: source });
    const description = isUnknown(row.Description)
      ? name + ' 是 Heartopia 中的一种材料。'
      : cleanText(row.Description);
    const tips = [];
    if (source) tips.push('主要获取途径：' + source + '。');
    if (price > 0) tips.push('出售价约 ' + price + ' 金币。');
    tips.push('材料通常用于烹饪、制作台合成或任务交付，建议保留一定数量。');
    return {
      slug: slugs[index],
      name: name,
      category: source || '材料',
      location: [],
      time: [],
      weather: [],
      level: '',
      price: price,
      description: description,
      facts: facts,
      tips: tips
    };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function buildNpcs(rows) {
  const list = dedupeByName(rows);
  const slugs = uniqueSlugs(list.map(function (row) { return cleanText(row.Name); }));
  return list.map(function (row, index) {
    const name = cleanText(row.Name);
    const role = isUnknown(row.Role) ? 'NPC' : cleanText(row.Role);
    const location = isUnknown(row.Location) ? [] : cleanList(row.Location);
    const address = isUnknown(row.Address) ? '' : cleanText(row.Address);
    const birthday = isUnknown(row.Birthday) ? '' : cleanText(row.Birthday);
    const favorites = cleanList(row.Favorites);
    const place = location.length ? location.join('、') : '未知地点';
    const facts = [];
    if (birthday) facts.push({ label: '生日', value: birthday });
    if (address) facts.push({ label: '住址', value: address });
    if (favorites.length) facts.push({ label: '喜好', value: favorites.join('、') });
    const tips = [];
    if (favorites.length) tips.push('送出「' + favorites.join('、') + '」类礼物更容易提升好感度。');
    if (birthday) tips.push('生日：' + birthday + '，当天送礼有额外加成。');
    tips.push('日常出没于' + place + '，可以在附近商店与任务点找到。');
    return {
      slug: slugs[index],
      name: name,
      category: role,
      location: location,
      time: [],
      weather: [],
      level: '',
      price: 0,
      description: name + ' 是 Heartopia 中的' + role + '，常见于' + place + '。',
      facts: facts,
      tips: tips
    };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function buildLocations(rows) {
  const list = dedupeByName(rows);
  const slugs = uniqueSlugs(list.map(function (row) { return cleanText(row.Name); }));
  return list.map(function (row, index) {
    const name = cleanText(row.Name);
    const type = isUnknown(row.Type) ? '' : cleanText(row.Type);
    const parent = isUnknown(row.ParentLocation) ? '' : cleanText(row.ParentLocation);
    const owner = isUnknown(row.Owner) ? '' : cleanText(row.Owner);
    const hours = isUnknown(row.Hours) ? '' : cleanText(row.Hours);
    const inhabitants = cleanList(row.Inhabitants);
    const facts = [];
    if (parent) facts.push({ label: '所在区域', value: parent });
    if (owner) facts.push({ label: '负责人', value: owner });
    if (hours) facts.push({ label: '营业时间', value: hours });
    if (inhabitants.length) facts.push({ label: '常驻 NPC', value: inhabitants.join('、') });
    return {
      slug: slugs[index],
      name: name,
      category: type || '地点',
      location: parent ? [parent] : [],
      time: [],
      weather: [],
      level: '',
      price: 0,
      description: isUnknown(row.Description) ? name + ' 是 Heartopia 中的一个地点。' : cleanText(row.Description),
      facts: facts,
      tips: hours ? ['营业时间：' + hours + '。'] : []
    };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}

/**
 * 从食谱详情页解析材料的准确数量。
 *
 * Cargo 的 Recipes 表只记录了材料名，没有数量；数量在页面信息框的 Ingredients 行里，
 * 形如 <a title="Carrot">…</a></span>&#160;2x。这里按页面名抓取并解析。
 */
async function fetchRecipeIngredients(pageName) {
  const url = API + '?' + new URLSearchParams({
    action: 'parse', prop: 'text', format: 'json', formatversion: '2', page: pageName
  });
  let html = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const data = JSON.parse(await res.text());
      if (data.error) return null;
      html = (data.parse && data.parse.text) || '';
      break;
    } catch (error) {
      if (attempt === 2) return null;
      await new Promise(function (resolve) { setTimeout(resolve, 1200); });
    }
  }
  const start = html.indexOf('Ingredients');
  if (start === -1) return null;
  const cellEnd = html.indexOf('</tr>', start);
  const cell = html.slice(start, cellEnd === -1 ? start + 4000 : cellEnd);

  // 每个材料是一个 <span style="white-space:nowrap;">…&#160;Nx</span> 结构。
  // 图片可能是坏链（<span mw:Error>），此时只能从文件名推回材料名。
  const found = {};
  cell.split('<span style="white-space:nowrap;">').slice(1).forEach(function (chunk) {
    const qtyMatch = chunk.match(/&#160;\s*(\d+)x/);
    if (!qtyMatch) return;
    const qty = Number(qtyMatch[1]);
    if (!qty) return;
    const titles = Array.from(chunk.matchAll(/title="([^"]+)"/g)).map(function (m) { return m[1]; });
    const named = titles.filter(function (t) { return !/^File:/i.test(t); });
    let item = named.length ? named[0] : '';
    if (!item) {
      const file = titles.filter(function (t) { return /^File:/i.test(t); })[0];
      if (file) item = file.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
    }
    item = cleanText(item);
    if (!item || isUnknown(item)) return;
    found[item] = (found[item] || 0) + qty;
  });
  return Object.keys(found).length ? found : null;
}

function matchIngredient(found, ingredientName) {
  const target = cleanText(ingredientName).toLowerCase().replace(/\s+/g, ' ');
  if (!target) return 0;
  const keys = Object.keys(found);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const lower = key.toLowerCase().replace(/\s+/g, ' ');
    if (lower === target) return found[key];
  }
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const lower = key.toLowerCase().replace(/\s+/g, ' ');
    if (lower.indexOf(target) !== -1 || target.indexOf(lower) !== -1) return found[key];
  }
  return 0;
}

/* ---------- 作物（Crops 表） ---------- */

// wiki 的季节字段写法很杂，统一成中文；没收录的取值原样保留
const CROP_SEASON_MAP = {
  'all seasons': '全年',
  'year-round': '全年',
  'any season': '全年',
  'none': '全年',
  'daily': '每日',
  'spring': '春季',
  'summer': '夏季',
  'autumn': '秋季',
  'winter': '冬季'
};

// 无法换算成时长的描述性取值，翻译保留原意
const CROP_GROWTH_FALLBACK = {
  'a few days (daily watering required; rain skips watering)': '约几天（需每天浇水，雨天免浇）',
  '1+ days (multiple growth cycles)': '1 天以上（可多次生长）',
  '1-2 days (with watering)': '1-2 天（需浇水）',
  'plant seeds and water daily; harvest in next day(s)': '每天播种浇水，次日起可收获'
};

function normalizeCropSeason(value) {
  const raw = cleanText(value);
  if (isUnknown(raw)) return '未标注';
  return CROP_SEASON_MAP[raw.toLowerCase()] || raw;
}

function normalizeCropGrowth(value) {
  const raw = cleanText(value);
  if (isUnknown(raw)) return '未标注';
  const hours = raw.match(/^(\d+(?:\.\d+)?)\s*hours?$/i);
  if (hours) return Number(hours[1]) + ' 小时';
  const minutes = raw.match(/^(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)$/i);
  if (minutes) return Number(minutes[1]) + ' 分钟';
  return CROP_GROWTH_FALLBACK[raw.toLowerCase()] || raw;
}

const CROP_TYPE_MAP = {
  'crop': '作物',
  'vegetable': '蔬菜',
  'flower': '花卉'
};

function cropCategory(type) {
  const raw = cleanText(type);
  return CROP_TYPE_MAP[raw.toLowerCase()] || '作物';
}

function gardeningLevel(value) {
  const raw = cleanText(value);
  if (isUnknown(raw)) return 0;
  const matched = raw.match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

// 同一作物在表里可能有多行，挑信息最完整的一行（有价格的优先）
function pickCropRows(rows) {
  const map = new Map();
  rows.forEach(function (row) {
    const name = cleanText(row.Name);
    if (!name || isUnknown(name)) return;
    const priced = toNumber(row.SeedPrice) > 0 && toNumber(row.SellPrice) > 0 ? 2 : 0;
    const filled = [row.Type, row.Season, row.Growth, row.Regrowth, row.Level].reduce(function (sum, value) {
      return sum + (isUnknown(value) ? 0 : 1);
    }, 0);
    const score = priced + filled;
    const current = map.get(name);
    if (!current || score > current.score) map.set(name, { row: row, score: score });
  });
  return Array.from(map.values()).map(function (entry) { return entry.row; });
}

function buildCrops(rows) {
  // 种子是商店商品，不是可种植作物，单独排除
  const plants = pickCropRows(rows).filter(function (row) {
    return cleanText(row.Type).toLowerCase().indexOf('seed') === -1;
  });
  const slugs = uniqueSlugs(plants.map(function (row) { return cleanText(row.Name); }));

  const items = plants.map(function (row, index) {
    const name = cleanText(row.Name);
    const type = cleanText(row.Type);
    const seedCost = toNumber(row.SeedPrice);
    const sellPrice = toNumber(row.SellPrice);
    const profit = seedCost > 0 && sellPrice > 0 ? sellPrice - seedCost : 0;
    const growth = normalizeCropGrowth(row.Growth);
    const hours = growth.match(/^([\d.]+)\s*小时$/);
    const mins = growth.match(/^([\d.]+)\s*分钟$/);
    const minutes = hours ? Number(hours[1]) * 60 : (mins ? Number(mins[1]) : 0);
    const level = gardeningLevel(row.Level);
    const regrowRaw = cleanText(row.Regrowth).toLowerCase();
    const source = cleanText(row.Source);

    const facts = [
      { label: '类型', value: type || '作物' },
      { label: 'wiki 原始季节', value: cleanText(row.Season) || '未记录' },
      { label: 'wiki 原始生长时间', value: cleanText(row.Growth) || '未记录' }
    ];
    if (!isUnknown(row.Level)) facts.push({ label: '解锁条件', value: cleanText(row.Level) });
    if (source) facts.push({ label: '种子来源', value: source });
    facts.push({ label: '数据来源', value: 'heartopiawiki.com' });

    const tips = [];
    if (seedCost > 0 && sellPrice > 0) {
      tips.push('种子 ' + seedCost + ' 金币，直接出售 ' + sellPrice + ' 金币，每格净赚 ' + profit + ' 金币。');
      if (sellPrice > 0) tips.push('利润率约 ' + Math.round((profit / sellPrice) * 100) + '%，' + (profit > 0 ? '值得量产。' : '收益偏低，建议只种任务需要的量。'));
    } else {
      tips.push('wiki 暂未记录这种作物的种子价格与售价，收益数据待补。');
    }
    if (minutes > 0) {
      tips.push('生长 ' + growth + '，理论上一天可以收 ' + Math.round(1440 / minutes) + ' 轮（含立刻补种）。');
    } else {
      tips.push('生长时间：' + growth + '，具体时长以游戏内为准。');
    }
    if (!level) tips.push('wiki 未记录解锁等级，先确认园艺等级是否满足。');
    if (type.toLowerCase() === 'flower') tips.push('花卉主要用于装饰、赠礼与交付订单，直接出售收益一般。');

    return {
      slug: slugs[index],
      name: name,
      category: cropCategory(row.Type),
      season: normalizeCropSeason(row.Season),
      growthTime: growth,
      seedCost: seedCost,
      sellPrice: sellPrice,
      profit: profit,
      regrow: regrowRaw === 'no' ? false : null,
      unlockLevel: level,
      tips: tips,
      facts: facts,
      source: 'wiki'
    };
  });

  return items.sort(function (a, b) { return b.profit - a.profit; });
}

function buildRecipes(rows) {
  const list = dedupeByName(rows);
  const slugs = uniqueSlugs(list.map(function (row) { return cleanText(row.Name); }));
  const kitchenMap = { 'stove': '灶台料理', 'penguin stove': '企鹅灶台料理' };
  const imported = [];
  list.forEach(function (row, index) {
    const name = cleanText(row.Name);
    const kitchen = cleanText(row.RequiredKitchenware).toLowerCase();
    const category = kitchenMap[kitchen] || '其他料理';
    const price = toNumber(row.Price);
    const energy = toNumber(row.Energy);
    const level = toNumber(row.Level);
    const buyPrice = toNumber(row.BuyPrice);
    const buff = isUnknown(row.Buff) ? '' : cleanText(row.Buff);
    const source = isUnknown(row.Source) ? '' : cleanText(row.Source);
    const period = isUnknown(row.ActivePeriod) ? '' : cleanText(row.ActivePeriod);

    const ingredients = cleanText(row.Ingredients).split(',')
      .map(function (part) { return part.trim(); })
      .filter(function (part) { return part && !isUnknown(part); })
      .map(function (part) { return { item: part, qty: 0 }; });

    const effectParts = [];
    if (energy > 0) effectParts.push('恢复 ' + energy + ' 体力');
    if (buff) effectParts.push('加成 ' + buff);

    const tips = [];
    if (category !== '其他料理') tips.push('需要' + cleanText(row.RequiredKitchenware) + '制作。');
    if (level > 0) tips.push('烹饪等级达到 ' + level + ' 后解锁。');
    if (period) tips.push('出现时段：' + period + '。');
    if (source) tips.push('配方来源：' + source + '。');
    if (buyPrice > 0) tips.push('直接购买需要 ' + buyPrice + ' 金币，自己做更省钱。');

    const facts = [];
    if (!isUnknown(row.RequiredKitchenware)) facts.push({ label: '所需厨具', value: cleanText(row.RequiredKitchenware) });
    if (buff) facts.push({ label: '料理加成', value: buff });
    if (period) facts.push({ label: '出现时段', value: period });
    if (buyPrice > 0) facts.push({ label: '购买价', value: buyPrice + ' 金币' });
    if (source) facts.push({ label: '配方来源', value: source });

    imported.push({
      slug: slugs[index],
      name: name,
      category: category,
      sellPrice: price,
      unlock: level > 0 ? '烹饪等级 ' + level : '初始',
      effect: effectParts.join('，'),
      ingredients: ingredients,
      steps: [],
      tips: tips,
      facts: facts,
      source: 'wiki'
    });
  });
  return imported;
}

function mergeRecipes(imported) {
  const file = join(dataDir, 'recipes.json');
  let existing = [];
  if (existsSync(file)) existing = JSON.parse(readFileSync(file, 'utf8'));
  const curated = existing.filter(function (item) { return item.source !== 'wiki'; });
  const curatedNames = new Set(curated.map(function (item) { return item.name; }));
  const merged = curated.concat(imported.filter(function (item) { return !curatedNames.has(item.name); }));
  // 手工条目优先保留原 slug，导入条目的重复 slug 自动加序号
  const used = new Set();
  merged.forEach(function (item) {
    const base = item.slug || slugify(item.name);
    let slug = base;
    let index = 2;
    while (used.has(slug)) { slug = base + '-' + index; index += 1; }
    used.add(slug);
    item.slug = slug;
  });
  merged.sort(function (a, b) { return (b.sellPrice || 0) - (a.sellPrice || 0); });
  return merged;
}

/* ---------- 主流程 ---------- */

const tasks = {
  bugs: async function () { writeJson('bugs.json', buildBugs(await fetchTable('Bugs'))); return 'bugs.json'; },
  materials: async function () { writeJson('materials.json', buildMaterials(await fetchTable('Materials'))); return 'materials.json'; },
  npcs: async function () { writeJson('npcs.json', buildNpcs(await fetchTable('NPCs'))); return 'npcs.json'; },
  locations: async function () { writeJson('locations.json', buildLocations(await fetchTable('Locations'))); return 'locations.json'; },
  crops: async function () { const items = buildCrops(await fetchTable('Crops')); writeJson('farming.json', items); return 'farming.json (' + items.length + ' 条，覆盖手写数据)'; },
  recipes: async function () {
    const merged = mergeRecipes(buildRecipes(await fetchTable('Recipes')));
    writeJson('recipes.json', merged);
    return 'recipes.json (' + merged.length + ' 条)';
  },
  'recipe-details': async function () {
    const recipes = JSON.parse(readFileSync(join(dataDir, 'recipes.json'), 'utf8'));
    let patched = 0;
    const failed = [];
    for (const recipe of recipes) {
      if (recipe.source !== 'wiki') continue;
      const found = await fetchRecipeIngredients(recipe.name);
      if (!found) { failed.push(recipe.name); continue; }
      let changed = false;
      recipe.ingredients = (recipe.ingredients || []).map(function (ingredient) {
        const qty = matchIngredient(found, ingredient.item);
        if (qty && qty !== ingredient.qty) { changed = true; return { item: ingredient.item, qty: qty }; }
        return ingredient;
      });
      if (changed) patched += 1;
      await new Promise(function (resolve) { setTimeout(resolve, 150); });
    }
    writeJson('recipes.json', recipes);
    if (failed.length) console.warn('  未能解析的食谱（' + failed.length + '）：' + failed.join('、'));
    return 'recipes.json（补全 ' + patched + ' 条材料数量）';
  },
};

const requested = process.argv.slice(2).filter(function (name) { return tasks[name]; });
const names = requested.length ? requested : Object.keys(tasks);

for (const name of names) {
  try {
    const result = await tasks[name]();
    console.log('导入完成：' + name + ' -> ' + result);
  } catch (error) {
    console.error('导入失败：' + name + ' — ' + error.message);
    process.exitCode = 1;
  }
}
