/**
 * 全站 SEO 工具：统一生成 title / description / JSON-LD，中英文各一套。
 *
 * 页面只负责把数据传进来，文案模板集中在这里。
 * 新增模块或新增条目时不需要再写一遍 SEO 逻辑，description 会自动保持唯一。
 *
 * 约定：
 *   - 每个 description 都以条目名 / 页面主题开头，保证截断后依然唯一
 *   - 只翻译术语和单位（走 src/i18n/data.mjs），不生成数据里没有的事实
 *   - 作者原创的中文长文不会出现在英文页面里，改用结构化字段概述并提示英文版整理中
 */
import { formatNumber } from './content.js';
import { HTML_LANG, listSeparator } from '../i18n/config.mjs';
import { localizeList, localizeValue } from '../i18n/data.mjs';

export const DESCRIPTION_MIN = 60;
export const DESCRIPTION_MAX = 160;
export const TITLE_MAX = 60;

// 已经写进描述正文的 facts 标签，避免在补充信息里重复一遍
const COVERED_FACT_LABELS = ['出现等级', 'Spawn Level', '天气', 'Weather', '出没地点', 'Location', '出现时间', 'Time', '所在区域', 'Area'];

function stripEnd(text) {
  return String(text == null ? '' : text)
    .replace(/[。．.!！?？；;]+$/, '')
    .trim();
}

/** 把多个短语拼成一句话：中文用顿号式逗号，英文用逗号加空格 */
export function sentence(locale, parts) {
  const list = [];
  parts.forEach(function (part) {
    const value = stripEnd(part);
    if (value) list.push(value);
  });
  if (!list.length) return '';
  return list.join(locale === 'zh' ? '，' : ', ') + (locale === 'zh' ? '。' : '.');
}

/** 压缩空白并截断到 max 字，尽量在标点处断开 */
export function clampText(text, max) {
  const limit = max || DESCRIPTION_MAX;
  const value = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (value.length <= limit) return value;
  const slice = value.slice(0, limit);
  const cut = Math.max(
    slice.lastIndexOf('。'),
    slice.lastIndexOf('；'),
    slice.lastIndexOf('，'),
    slice.lastIndexOf('、'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf(', '),
    slice.lastIndexOf(' ')
  );
  const head = cut >= Math.floor(limit * 0.6) ? slice.slice(0, cut) : slice;
  return head.replace(/[，、；,\s]+$/, '') + '…';
}

function factValue(item, label) {
  const facts = Array.isArray(item.facts) ? item.facts : [];
  const hit = facts.filter(function (fact) { return fact && fact.label === label; })[0];
  return hit && hit.value ? String(hit.value) : '';
}

function unusedFacts(locale, item) {
  const facts = Array.isArray(item.facts) ? item.facts : [];
  return facts
    .filter(function (fact) {
      return fact && fact.label && fact.value && COVERED_FACT_LABELS.indexOf(fact.label) === -1;
    })
    .map(function (fact) {
      return localizeValue(locale, fact.label) + (locale === 'zh' ? '：' : ': ') + localizeList(locale, fact.value);
    });
}

/** 图鉴条目共用的字段视图 */
function catalogContext(locale, item) {
  const price = Number(item.price || 0);
  return {
    category: localizeValue(locale, item.category),
    location: localizeList(locale, item.location),
    time: localizeList(locale, item.time),
    weather: localizeList(locale, item.weather),
    level: String(item.level == null ? '' : item.level).trim(),
    price: price > 0 ? formatNumber(price) : ''
  };
}

/**
 * 通用图鉴模块的 description 模板（按模块 id 取用）。
 * 未登记的模块会走 genericCatalogDescription，所以新增模块无需改这里。
 */
const CATALOG_TEMPLATES = {
  bugs: {
    zh: function (item, ctx) {
      return sentence('zh', [
        item.name + ' 是 Heartopia 昆虫图鉴中的一种昆虫',
        ctx.location ? '出没地点 ' + ctx.location : '出没地点仍在补充',
        ctx.time ? '出现时间 ' + ctx.time : '',
        ctx.weather ? '天气条件 ' + ctx.weather : '',
        ctx.level ? '出现等级 ' + ctx.level : '',
        ctx.price ? '售价约 ' + ctx.price + ' 金币' : '售价暂未记录'
      ]);
    },
    en: function (item, ctx) {
      return sentence('en', [
        item.name + ' is a bug in the Heartopia bug database',
        ctx.location ? 'found in ' + ctx.location : 'location still being filled in',
        ctx.time ? 'active ' + ctx.time : '',
        ctx.weather ? 'weather ' + ctx.weather : '',
        ctx.level ? 'spawn level ' + ctx.level : '',
        ctx.price ? 'sells for about ' + ctx.price + ' Gold' : 'price not recorded yet'
      ]);
    }
  },
  materials: {
    zh: function (item, ctx) {
      const obtain = factValue(item, '获取方式') || ctx.category;
      return sentence('zh', [
        item.name + ' 是 Heartopia 材料图鉴中的材料',
        obtain ? '获取方式：' + obtain : '',
        ctx.price ? '售价约 ' + ctx.price + ' 金币' : '暂无出售价格',
        '主要用于烹饪、制作台合成与任务交付，建议常备一批'
      ]);
    },
    en: function (item, ctx) {
      const obtain = factValue(item, '获取方式') || ctx.category;
      return sentence('en', [
        item.name + ' is a material in the Heartopia material database',
        obtain ? 'obtained from ' + localizeValue('en', obtain) : '',
        ctx.price ? 'sells for about ' + ctx.price + ' Gold' : 'no recorded sale price',
        'used in cooking, crafting station recipes and quest turn-ins'
      ]);
    }
  },
  npcs: {
    zh: function (item, ctx) {
      return sentence('zh', [
        item.name + ' 是 Heartopia 中的 NPC' + (ctx.category ? '（' + ctx.category + '）' : ''),
        ctx.location ? '常驻位置 ' + ctx.location : '常驻位置仍在补充'
      ].concat(unusedFacts('zh', item)).concat([
        '送出喜欢的礼物可以更快提升好感度'
      ]));
    },
    en: function (item, ctx) {
      return sentence('en', [
        item.name + ' is an NPC in Heartopia' + (ctx.category ? ' (' + ctx.category + ')' : ''),
        ctx.location ? 'usually found in ' + ctx.location : 'location still being filled in'
      ].concat(unusedFacts('en', item)).concat([
        'gifting what they like raises friendship faster'
      ]));
    }
  },
  locations: {
    zh: function (item, ctx) {
      const region = factValue(item, '所在区域') || ctx.location;
      const hours = factValue(item, '营业时间');
      const owner = factValue(item, '负责人');
      return sentence('zh', [
        item.name + ' 是 Heartopia 中的一处地点',
        ctx.category && ctx.category !== '地点' ? '类型 ' + ctx.category : '',
        region ? '所在区域 ' + region : '',
        hours ? '营业时间 ' + hours : '',
        owner ? '负责人 ' + owner : '',
        '前往前建议先确认营业时间'
      ]);
    },
    en: function (item, ctx) {
      const region = factValue(item, '所在区域') || ctx.location;
      const hours = factValue(item, '营业时间');
      const owner = factValue(item, '负责人');
      const type = localizeValue('en', ctx.category);
      return sentence('en', [
        item.name + ' is a location in Heartopia',
        type && type !== 'Location' ? 'type ' + type : '',
        region ? 'in ' + localizeValue('en', region) : '',
        hours ? 'open ' + hours : '',
        owner ? 'run by ' + localizeValue('en', owner) : '',
        'check the opening hours before visiting'
      ]);
    }
  }
};

function genericCatalogDescription(locale, collection, item, ctx) {
  if (locale === 'zh') {
    return sentence('zh', [
      item.name + ' 是 Heartopia ' + collection.name + '收录的条目',
      ctx.category ? '分类 ' + ctx.category : '',
      ctx.location ? '地点 ' + ctx.location : '',
      ctx.time ? '出现时间 ' + ctx.time : '',
      ctx.weather ? '天气条件 ' + ctx.weather : '',
      ctx.level ? '等级要求 ' + ctx.level : '',
      ctx.price ? '售价约 ' + ctx.price + ' 金币' : '',
      collection.desc
    ].concat(unusedFacts('zh', item)));
  }
  return sentence('en', [
    item.name + ' is an entry in the Heartopia ' + collection.name,
    ctx.category ? 'category ' + ctx.category : '',
    ctx.location ? 'location ' + ctx.location : '',
    ctx.time ? 'active ' + ctx.time : '',
    ctx.weather ? 'weather ' + ctx.weather : '',
    ctx.level ? 'level ' + ctx.level : '',
    ctx.price ? 'sells for about ' + ctx.price + ' Gold' : '',
    collection.desc
  ].concat(unusedFacts('en', item)));
}

/** 通用图鉴详情页 description（昆虫 / 材料 / NPC / 地点，以及后续新增模块） */
export function catalogDescription(locale, collection, item) {
  const ctx = catalogContext(locale, item);
  const template = CATALOG_TEMPLATES[collection.id];
  let text = template
    ? template[locale](item, ctx)
    : genericCatalogDescription(locale, collection, item, ctx);

  if (text.length < DESCRIPTION_MIN) {
    text = sentence(locale, [
      text,
      collection.desc,
      locale === 'zh' ? '页面内含完整属性与攻略提示' : 'full stats and tips on the page'
    ]);
  }
  if (text.length < 10) {
    text = sentence(locale, [
      item.name + (locale === 'zh' ? ' 是 Heartopia ' + collection.name + '收录的条目' : ' is an entry in the Heartopia ' + collection.name),
      collection.desc
    ]);
  }
  return clampText(text);
}

/** 鱼图鉴详情页 */
export function fishDescription(locale, item) {
  const ctx = catalogContext(locale, item);
  const season = localizeList(locale, item.season);
  const size = localizeList(locale, item.size);
  const difficulty = localizeValue(locale, item.difficulty);
  if (locale === 'zh') {
    return clampText(sentence('zh', [
      item.name + ' 是 Heartopia 鱼图鉴中的一种鱼类',
      ctx.location ? '出没地点 ' + ctx.location : '',
      ctx.time ? '出现时间 ' + ctx.time : '',
      ctx.weather ? '天气条件 ' + ctx.weather : '',
      season ? '季节 ' + season : '',
      size ? '体型 ' + size : '',
      difficulty ? '上钩难度 ' + difficulty : '',
      ctx.price ? '售价约 ' + ctx.price + ' 金币' : '售价暂未记录'
    ]));
  }
  return clampText(sentence('en', [
    item.name + ' is a fish in the Heartopia fish database',
    ctx.location ? 'found in ' + ctx.location : '',
    ctx.time ? 'active ' + ctx.time : '',
    ctx.weather ? 'weather ' + ctx.weather : '',
    season ? 'season ' + season : '',
    size ? 'size ' + size : '',
    difficulty ? 'difficulty ' + difficulty : '',
    ctx.price ? 'sells for about ' + ctx.price + ' Gold' : 'price not recorded yet'
  ]));
}

/** 烹饪食谱详情页 */
export function recipeDescription(locale, item) {
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const names = ingredients.map(function (ing) {
    return ing.qty ? ing.item + ' ×' + ing.qty : ing.item;
  }).join(listSeparator(locale));
  const category = localizeValue(locale, item.category);
  const unlock = localizeValue(locale, item.unlock);
  const effect = localizeValue(locale, item.effect);
  const price = Number(item.sellPrice || 0);

  if (locale === 'zh') {
    return clampText(sentence('zh', [
      item.name + ' 是 Heartopia 烹饪食谱收录的' + (category || '料理'),
      names ? '需要材料 ' + names : '具体材料暂未收录',
      unlock ? '解锁条件 ' + unlock : '',
      effect ? '食用效果 ' + effect : '',
      price > 0 ? '出售价约 ' + formatNumber(price) + ' 金币' : '出售价格暂未收录'
    ]));
  }
  return clampText(sentence('en', [
    item.name + ' is a Heartopia recipe' + (category ? ' (' + category + ')' : ''),
    names ? 'needs ' + names : 'ingredients not recorded yet',
    unlock ? 'unlocks at ' + unlock : '',
    effect ? effect : '',
    price > 0 ? 'sells for about ' + formatNumber(price) + ' Gold' : 'no recorded sale price'
  ]));
}

/** 种植攻略详情页 */
export function cropDescription(locale, item) {
  const seed = Number(item.seedCost || 0);
  const sell = Number(item.sellPrice || 0);
  const profit = Number(item.profit || 0);
  const season = localizeValue(locale, item.season);
  const growth = localizeValue(locale, item.growthTime);

  if (locale === 'zh') {
    return clampText(sentence('zh', [
      item.name + ' 是 Heartopia 种植攻略中的作物',
      season ? '适合' + season + '种植' : '',
      growth ? '成熟时间 ' + growth : '',
      seed > 0 ? '种子成本 ' + formatNumber(seed) + ' 金币' : '',
      sell > 0 ? '售价 ' + formatNumber(sell) + ' 金币' : '',
      profit > 0 ? '单次净利润约 ' + formatNumber(profit) + ' 金币' : '',
      item.unlockLevel ? '解锁等级 ' + item.unlockLevel : ''
    ]));
  }
  return clampText(sentence('en', [
    item.name + ' is a crop in the Heartopia farming guide',
    season ? 'planted ' + season : '',
    growth ? 'matures in ' + growth : '',
    seed > 0 ? 'seed cost ' + formatNumber(seed) + ' Gold' : '',
    sell > 0 ? 'sells for ' + formatNumber(sell) + ' Gold' : '',
    profit > 0 ? 'net profit about ' + formatNumber(profit) + ' Gold per harvest' : '',
    item.unlockLevel ? 'unlock level ' + item.unlockLevel : ''
  ]));
}

/**
 * 赚钱攻略详情页。
 * 正文是中文原创内容，英文页只概述结构化信息，不翻译正文。
 */
export function moneyGuideDescription(locale, item) {
  const requirements = (item.requirements || []).slice(0, 4);
  if (locale === 'zh') {
    return clampText(sentence('zh', [
      item.summary,
      '属于 Heartopia 赚钱攻略中的路线',
      item.difficulty ? '难度 ' + item.difficulty : '',
      item.incomePerHour ? '收益约 ' + item.incomePerHour : '',
      item.timeRequired ? '耗时 ' + item.timeRequired : '',
      requirements.length ? '需要' + requirements.join('、') : '',
      (item.steps || []).length ? '共 ' + item.steps.length + ' 个步骤' : ''
    ]));
  }
  return clampText(sentence('en', [
    item.title + ' is a money-making route in the Heartopia money guide',
    item.difficulty ? 'difficulty ' + localizeValue('en', item.difficulty) : '',
    item.incomePerHour ? 'about ' + localizeValue('en', item.incomePerHour) : '',
    item.timeRequired ? localizeValue('en', item.timeRequired) : '',
    (item.steps || []).length ? (item.steps.length + ' steps') : '',
    requirements.length ? (requirements.length + ' requirements') : ''
  ]));
}

/** 新手指南详情页（同上，正文为中文原创） */
export function beginnerGuideDescription(locale, item) {
  const sections = item.sections || [];
  const tips = item.tips || [];
  if (locale === 'zh') {
    return clampText(sentence('zh', [
      item.summary,
      '属于 Heartopia 新手指南的「' + item.category + '」系列',
      item.readTime ? '预计阅读 ' + item.readTime : '',
      sections.length ? '包含 ' + sections.length + ' 个要点' : '',
      tips.length ? tips.length + ' 条小贴士' : ''
    ]));
  }
  return clampText(sentence('en', [
    item.title + ' is a beginner guide on HeartopiaHub',
    sections.length ? (sections.length + ' key sections') : '',
    tips.length ? (tips.length + ' tips') : '',
    item.readTime ? ('about ' + localizeValue('en', item.readTime) + ' to read') : '',
    'the full walkthrough is currently in Chinese'
  ]));
}

/* ------------------------------------------------------------------ *
 * JSON-LD 构造器
 * ------------------------------------------------------------------ */

/** 把站内路径转成绝对地址 */
export function absoluteUrl(path, site) {
  return new URL(path, site).href;
}

export function websiteRef(site) {
  return { '@id': site + '#website' };
}

export function organizationRef(site) {
  return { '@id': site + '#organization' };
}

export function webPageRef(canonical) {
  return { '@id': canonical + '#webpage' };
}

export function breadcrumbRef(canonical) {
  return { '@id': canonical + '#breadcrumb' };
}

/** 页面上用到的属性表，供 additionalProperty 复用 */
export function itemPropertyValues(locale, item, extraPairs) {
  const rows = [];
  function push(name, value) {
    const text = String(value == null ? '' : value).trim();
    if (text) rows.push({ name: name, value: text });
  }

  push(locale === 'zh' ? '分类' : 'Category', localizeValue(locale, item.category));
  push(locale === 'zh' ? '出没地点' : 'Location', localizeList(locale, item.location));
  push(locale === 'zh' ? '出现时间' : 'Time', localizeList(locale, item.time));
  push(locale === 'zh' ? '天气条件' : 'Weather', localizeList(locale, item.weather));
  push(locale === 'zh' ? '等级要求' : 'Level', String(item.level == null ? '' : item.level).trim());
  if (Number(item.price) > 0) {
    push(locale === 'zh' ? '售价' : 'Price', formatNumber(item.price) + (locale === 'zh' ? ' 金币' : ' Gold'));
  }
  (Array.isArray(item.facts) ? item.facts : []).forEach(function (fact) {
    if (fact && fact.label && fact.value) {
      push(localizeValue(locale, fact.label), localizeList(locale, fact.value));
    }
  });
  if (Array.isArray(extraPairs)) {
    extraPairs.forEach(function (pair) { push(pair.label, pair.value); });
  }

  const seen = {};
  return rows
    .filter(function (row) {
      if (seen[row.name]) return false;
      seen[row.name] = true;
      return true;
    })
    .map(function (row) {
      return { '@type': 'PropertyValue', name: row.name, value: row.value };
    });
}

/** 列表页 ItemList：带上每条的链接，便于搜索引擎顺着抓取详情页 */
export function itemListLd(options) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  const limit = typeof options.limit === 'number' ? options.limit : 100;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': absoluteUrl(options.path, options.site) + '#itemlist',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path, options.site),
    inLanguage: HTML_LANG[options.locale] || undefined,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.slice(0, limit).map(function (entry, index) {
      const node = {
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: absoluteUrl(entry.path, options.site)
      };
      if (entry.description) node.description = entry.description;
      return node;
    })
  };
}

/** 图鉴 / 攻略详情页主节点 */
export function contentPageLd(options) {
  const item = options.item;
  const node = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': options.canonical + '#article',
    headline: options.headline,
    name: options.headline,
    description: options.description,
    inLanguage: HTML_LANG[options.locale],
    mainEntityOfPage: webPageRef(options.canonical),
    isPartOf: websiteRef(options.site),
    publisher: organizationRef(options.site),
    articleSection: options.section
  };
  if (options.aboutName) node.about = { '@type': 'Thing', name: options.aboutName };
  if (item) {
    const properties = itemPropertyValues(options.locale, item, options.extraProperties);
    if (properties.length) node.additionalProperty = properties;
  }
  return node;
}
