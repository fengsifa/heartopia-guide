import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionConfigs } from '../src/lib/collections-config.mjs';

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

const items = [];

function push(item) {
  items.push(item);
}

codes.forEach(function (item) {
  push({
    id: 'code-' + item.code,
    title: item.code,
    subtitle: item.reward,
    description: item.note || '兑换码奖励',
    url: '/codes/',
    category: '兑换码',
    keywords: [item.code, item.reward, item.status].join(' ')
  });
});

recipes.forEach(function (item) {
  push({
    id: 'recipe-' + item.slug,
    title: item.name,
    subtitle: item.category + ' · 售价 ' + item.sellPrice,
    description: item.effect + '，材料：' + item.ingredients.map(function (x) { return x.item + ' x' + x.qty; }).join('、'),
    url: '/cooking/' + item.slug + '/',
    category: '烹饪食谱',
    keywords: [item.name, item.category, item.effect, item.ingredients.map(function (x) { return x.item; }).join(' ')].join(' ')
  });
});

fish.forEach(function (item) {
  push({
    id: 'fish-' + item.slug,
    title: item.name,
    subtitle: item.location.join('、') + ' · ' + item.price + ' 金币',
    description: item.description,
    url: '/fish/' + item.slug + '/',
    category: '鱼图鉴',
    keywords: [item.name, item.location.join(' '), item.time.join(' '), item.weather.join(' '), item.size.join(' ')].join(' ')
  });
});

money.forEach(function (item) {
  push({
    id: 'money-' + item.slug,
    title: item.title,
    subtitle: item.incomePerHour + ' · ' + item.difficulty,
    description: item.summary,
    url: '/money/' + item.slug + '/',
    category: '赚钱攻略',
    keywords: [item.title, item.difficulty, item.incomePerHour].join(' ')
  });
});

beginner.forEach(function (item) {
  push({
    id: 'beginner-' + item.slug,
    title: item.title,
    subtitle: item.category + ' · ' + item.readTime,
    description: item.summary,
    url: '/beginner/' + item.slug + '/',
    category: '新手指南',
    keywords: [item.title, item.category, item.summary].join(' ')
  });
});

farming.forEach(function (item) {
  push({
    id: 'crop-' + item.slug,
    title: item.name,
    subtitle: item.season + ' · 利润 ' + item.profit,
    description: item.tips.join('；'),
    url: '/farming/' + item.slug + '/',
    category: '种植攻略',
    keywords: [item.name, item.season, item.tips.join(' ')].join(' ')
  });
});

(mapData.markers || []).forEach(function (marker) {
  push({
    id: 'map-' + marker.id,
    title: marker.name,
    subtitle: '地图标记',
    description: marker.description,
    url: '/map/',
    category: '互动地图',
    keywords: [marker.name, marker.category, marker.description].join(' ')
  });
});

// 通用图鉴模块（昆虫 / 材料 / NPC 等），由 collections-config.mjs 统一驱动
collectionConfigs.forEach(function (config) {
  const items = read(config.dataFile);
  items.forEach(function (item) {
    const location = (item.location || []).join('、');
    const time = (item.time || []).join('、');
    const weather = (item.weather || []).join('、');
    push({
      id: config.id + '-' + item.slug,
      title: item.name,
      subtitle: [item.category, location, time].filter(Boolean).join(' · '),
      description: item.description,
      url: config.path + item.slug + '/',
      category: config.name,
      keywords: [item.name, item.category, location, time, weather, item.level].filter(Boolean).join(' ')
    });
  });
});

mkdirSync(publicDir, { recursive: true });
writeFileSync(
  join(publicDir, 'search-index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items: items }, null, 2) + '\n',
  'utf8'
);

console.log('search index generated: ' + items.length + ' items');
