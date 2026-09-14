import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionConfigs, collectionText } from '../src/lib/collections-config.mjs';
import { LOCALES } from '../src/i18n/config.mjs';
import { localizeValue } from '../src/i18n/data.mjs';

/**
 * 生成站内搜索索引，每种语言一份：public/search-index.en.json / .zh.json
 *
 * 索引里的 URL 都带语言前缀，标题等展示文本按语言本地化，
 * 但 keywords 会把中英写法都塞进去，所以两种语言的索引都能搜到同一条数据。
 *
 * 用法：node scripts/build-search-index.mjs
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dataDir = join(root, 'src', 'data');
const publicDir = join(root, 'public');

function read(name) {
  return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
}

const site = read('site.json');
const codes = read('codes.json');
const recipes = read('recipes.json');
const fish = read('fish.json');
const money = read('money.json');
const beginner = read('beginner.json');
const mapData = read('map.json');
const farming = read('farming.json');

// 各模块的显示名（本地化）
const moduleName = {};
site.modules.forEach(function (mod) {
  moduleName[mod.id] = { zh: mod.name, en: mod.nameEn || mod.name };
});

function nameOf(id, locale) {
  const entry = moduleName[id];
  if (!entry) return id;
  return locale === 'zh' ? entry.zh : entry.en;
}

function gold(locale) {
  return locale === 'zh' ? '金币' : 'Gold';
}

function joinList(locale, value) {
  return localizeValue(locale, Array.isArray(value) ? value.join('、') : value);
}

function build(locale) {
  const items = [];
  const prefix = '/' + locale;

  function push(item) {
    item.url = prefix + item.url;
    items.push(item);
  }

  codes.forEach(function (item) {
    push({
      id: 'code-' + item.code,
      title: item.code,
      subtitle: locale === 'zh' ? item.reward : (item.rewardEn || item.reward),
      description: locale === 'zh' ? (item.note || '兑换码奖励') : (item.noteEn || item.note || 'Code reward'),
      url: '/codes/',
      category: nameOf('codes', locale),
      keywords: [item.code, item.reward, item.rewardEn, item.status].filter(Boolean).join(' ')
    });
  });

  recipes.forEach(function (item) {
    const ingredientList = (item.ingredients || []).map(function (x) { return x.item + ' x' + x.qty; }).join('、');
    const category = localizeValue(locale, item.category);
    const effect = localizeValue(locale, item.effect);
    push({
      id: 'recipe-' + item.slug,
      title: item.name,
      subtitle: category + ' · ' + item.sellPrice + ' ' + gold(locale),
      description: effect + (locale === 'zh' ? '，材料：' : ', ingredients: ') + ingredientList,
      url: '/cooking/' + item.slug + '/',
      category: nameOf('cooking', locale),
      keywords: [item.name, item.category, category, item.effect, effect, ingredientList].filter(Boolean).join(' ')
    });
  });

  fish.forEach(function (item) {
    const location = joinList(locale, item.location);
    const time = joinList(locale, item.time);
    const weather = joinList(locale, item.weather);
    const size = joinList(locale, item.size);
    push({
      id: 'fish-' + item.slug,
      title: item.name,
      subtitle: location + ' · ' + item.price + ' ' + gold(locale),
      description: item.description,
      url: '/fish/' + item.slug + '/',
      category: nameOf('fish', locale),
      keywords: [item.name, location, time, weather, size, item.difficulty].filter(Boolean).join(' ')
    });
  });

  money.forEach(function (item) {
    push({
      id: 'money-' + item.slug,
      title: item.titleEn || item.title,
      subtitle: localizeValue(locale, item.incomePerHour) + ' · ' + localizeValue(locale, item.difficulty),
      description: item.summaryEn || item.summary,
      url: '/money/' + item.slug + '/',
      category: nameOf('money', locale),
      keywords: [item.title, item.titleEn, item.summary, item.summaryEn, item.difficulty, item.incomePerHour].filter(Boolean).join(' ')
    });
  });

  beginner.forEach(function (item) {
    push({
      id: 'beginner-' + item.slug,
      title: item.titleEn || item.title,
      subtitle: localizeValue(locale, item.category) + ' · ' + localizeValue(locale, item.readTime),
      description: item.summaryEn || item.summary,
      url: '/beginner/' + item.slug + '/',
      category: nameOf('beginner', locale),
      keywords: [item.title, item.titleEn, item.category, item.summary, item.summaryEn].filter(Boolean).join(' ')
    });
  });

  farming.forEach(function (item) {
    const season = localizeValue(locale, item.season);
    push({
      id: 'crop-' + item.slug,
      title: item.name,
      subtitle: season + ' · ' + item.profit + ' ' + gold(locale),
      description: (item.tips || []).join(locale === 'zh' ? '；' : ' '),
      url: '/farming/' + item.slug + '/',
      category: nameOf('farming', locale),
      keywords: [item.name, item.season, season, localizeValue(locale, item.growthTime), (item.tips || []).join(' ')].filter(Boolean).join(' ')
    });
  });

  (mapData.markers || []).forEach(function (marker) {
    push({
      id: 'map-' + marker.id,
      title: marker.name,
      subtitle: nameOf('map', locale),
      description: marker.description,
      url: '/map/',
      category: nameOf('map', locale),
      keywords: [marker.name, marker.category, marker.description].filter(Boolean).join(' ')
    });
  });

  // 通用图鉴模块（昆虫 / 材料 / NPC / 地点），由 collections-config.mjs 统一驱动
  collectionConfigs.forEach(function (config) {
    const label = collectionText(locale, config, 'name');
    read(config.dataFile).forEach(function (item) {
      const location = joinList(locale, item.location);
      const time = joinList(locale, item.time);
      const weather = joinList(locale, item.weather);
      const category = localizeValue(locale, item.category);
      push({
        id: config.id + '-' + item.slug,
        title: item.name,
        subtitle: [category, location, time].filter(Boolean).join(' · '),
        description: item.description,
        url: config.path + item.slug + '/',
        category: label,
        keywords: [item.name, item.category, category, location, time, weather, item.level].filter(Boolean).join(' ')
      });
    });
  });

  return items;
}

mkdirSync(publicDir, { recursive: true });
LOCALES.forEach(function (locale) {
  const items = build(locale);
  const file = join(publicDir, 'search-index.' + locale + '.json');
  writeFileSync(
    file,
    JSON.stringify({ generatedAt: new Date().toISOString(), locale: locale, count: items.length, items: items }, null, 2) + '\n',
    'utf8'
  );
  console.log('search index generated: ' + locale + ' → ' + items.length + ' items');
});
