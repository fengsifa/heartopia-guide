/**
 * 用真实数据生成互动地图数据 src/data/map.json。
 *
 * 输入：
 *   src/data/fish.json      -> 钓鱼点（按出没地点聚合）
 *   src/data/bugs.json      -> 昆虫点（按出没地点聚合）
 *   src/data/npcs.json      -> NPC 常驻位置
 *   src/data/locations.json -> wiki Locations 表里的商店 / 地标
 *
 * 说明：
 * - 游戏内没有公开的坐标数据，因此点位坐标是按「区域色块内均匀排布」生成的示意坐标，
 *   用于快速定位大致方位，不代表真实距离。
 * - 区域（regions）由各数据源里的地点名称归并而来，归并规则见 LOCATION_REGION。
 *
 * 用法：node scripts/build-map.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { localizeValue } from '../src/i18n/data.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'src', 'data');

function read(name) {
  return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
}

function write(name, value) {
  writeFileSync(join(dataDir, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

// 区域：id / 名称 / 颜色 / 示意色块（百分比坐标）
const REGIONS = [
  { id: 'mountain', name: '温泉山', color: '#9fd3e8', box: { x: 12, y: 10, w: 24, h: 16 } },
  { id: 'forest', name: '森林', color: '#5fbf7f', box: { x: 8, y: 32, w: 26, h: 20 } },
  { id: 'town', name: 'Heartopia Town', color: '#f4b860', box: { x: 39, y: 30, w: 24, h: 20 } },
  { id: 'village', name: '渔村', color: '#ffb38a', box: { x: 68, y: 10, w: 24, h: 16 } },
  { id: 'sea', name: '海湾', color: '#4aa3df', box: { x: 68, y: 32, w: 26, h: 22 } },
  { id: 'lakes', name: '湖泊', color: '#7fc9f0', box: { x: 36, y: 56, w: 26, h: 18 } },
  { id: 'river', name: '河流', color: '#3f8fd6', box: { x: 8, y: 58, w: 24, h: 18 } },
  { id: 'suburbs', name: '郊区与家园', color: '#d9a441', box: { x: 68, y: 60, w: 26, h: 18 } },
  { id: 'event', name: '活动限定', color: '#a08cff', box: { x: 36, y: 80, w: 26, h: 12 } }
];

// 地点名 -> 区域 id
const LOCATION_REGION = {
  'Onsen Mountain': 'mountain',
  'Forest': 'forest',
  'Forest / Nature Areas': 'forest',
  'Spirit Oak Pine Forest': 'forest',
  'Fishing Village': 'village',
  'Sea': 'sea',
  'East Sea': 'sea',
  'Whale Sea': 'sea',
  'Old Sea': 'sea',
  'Ocean': 'sea',
  'Sea Fishing': 'sea',
  'Lake': 'lakes',
  'Starry Lake': 'lakes',
  'Meadow Lake': 'lakes',
  'Suburban Lake': 'lakes',
  'Forest Lake': 'lakes',
  'River': 'river',
  'Giantwood River': 'river',
  'Tranquil River': 'river',
  'Rosy River': 'river',
  'Shallow River': 'river',
  'River Bank': 'river',
  'Waterside': 'river',
  'Home': 'suburbs',
  'Suburbs': 'suburbs',
  'Central Area': 'town',
  'Heartopia Town': 'town',
  'Town Hall / Central Plaza': 'town',
  'Town River Pier': 'town',
  'West Corner of Heartopia Town': 'town',
  'Garden Street': 'town',
  'Central Plaza': 'town',
  'Flower Field': 'town',
  'Construction Workshop': 'town',
  'Clothing Store': 'town',
  'Restaurant': 'town',
  'Ranger Station': 'forest',
  'Golden Acorn Merchant Guild': 'town',
  'Event only': 'event'
};

const CATEGORIES = [
  { id: 'fishing', name: '钓鱼点', icon: '🐟' },
  { id: 'bug', name: '昆虫点', icon: '🦋' },
  { id: 'npc', name: 'NPC', icon: '🧑' },
  { id: 'shop', name: '商店与地标', icon: '🏪' }
];

function regionOf(name) {
  return LOCATION_REGION[name] || 'town';
}

function slugify(text) {
  return String(text).toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// 在区域色块内均匀排布点位
function place(box, index, total) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = cols === 1 ? box.x + box.w / 2 : box.x + (col / (cols - 1)) * box.w;
  const y = rows === 1 ? box.y + box.h / 2 : box.y + (row / (rows - 1)) * box.h;
  return { x: Math.round(x), y: Math.round(y) };
}

function groupByLocation(items) {
  const map = new Map();
  items.forEach(function (item) {
    (item.location || []).forEach(function (location) {
      if (!map.has(location)) map.set(location, []);
      map.get(location).push(item.name);
    });
  });
  return map;
}

const fish = read('fish.json');
const bugs = read('bugs.json');
const npcs = read('npcs.json');
const locations = read('locations.json');

const markers = [];

// 钓鱼点：每个出没地点一个标记
groupByLocation(fish).forEach(function (names, location) {
  markers.push({
    id: 'fish-' + slugify(location),
    name: location,
    category: 'fishing',
    region: regionOf(location),
    speciesCount: names.length,
    description: '钓鱼点，可钓到 ' + names.length + ' 种鱼：' + names.slice(0, 6).join('、')
      + (names.length > 6 ? ' 等' : '') + '。',
    descriptionEn: location + ' fishing spot — ' + names.length + ' species including '
      + names.slice(0, 6).join(', ') + (names.length > 6 ? ', and more' : '') + '.'
  });
});

// 昆虫点
groupByLocation(bugs).forEach(function (names, location) {
  markers.push({
    id: 'bug-' + slugify(location),
    name: location,
    category: 'bug',
    region: regionOf(location),
    speciesCount: names.length,
    description: '可捕捉 ' + names.length + ' 种昆虫：' + names.slice(0, 6).join('、')
      + (names.length > 6 ? ' 等' : '') + '。',
    descriptionEn: 'Bug spot with ' + names.length + ' species: '
      + names.slice(0, 6).join(', ') + (names.length > 6 ? ', and more' : '') + '.'
  });
});

// NPC：每个 NPC 一个标记，落在其常驻位置所属区域
npcs.forEach(function (npc) {
  const place0 = (npc.location || [])[0] || 'Central Area';
  const favorite = (npc.facts || []).filter(function (fact) { return fact.label === '喜好'; })[0];
  markers.push({
    id: 'npc-' + npc.slug,
    name: npc.name,
    category: 'npc',
    region: regionOf(place0),
    speciesCount: 0,
    description: npc.category + '，常驻' + place0 + (favorite ? '，喜好：' + favorite.value : '') + '。',
    descriptionEn: npc.category + ', usually found around ' + place0
      + (favorite ? ', likes ' + favorite.value : '') + '.'
  });
});

// 商店与地标（wiki Locations 表）
locations.forEach(function (location) {
  markers.push({
    id: 'shop-' + location.slug,
    name: location.name,
    category: 'shop',
    region: regionOf((location.location || [])[0] || ''),
    speciesCount: 0,
    description: location.description,
    // wiki 原文本身就是英文，直接用
    descriptionEn: localizeValue('en', location.description)
  });
});

// 按区域分组后均匀排布坐标
REGIONS.forEach(function (region) {
  const inRegion = markers.filter(function (marker) { return marker.region === region.id; });
  inRegion.forEach(function (marker, index) {
    const point = place(region.box, index, inRegion.length);
    marker.x = point.x;
    marker.y = point.y;
  });
});

const missing = markers.filter(function (marker) { return typeof marker.x !== 'number'; });
if (missing.length) {
  console.error('有 ' + missing.length + ' 个点位没有区域，请补充 LOCATION_REGION 映射');
  process.exit(1);
}

write('map.json', {
  note: '点位坐标是按区域色块均匀排布的示意坐标，用于快速定位大致方位，不代表真实距离。',
  regions: REGIONS.map(function (region) {
    const inRegion = markers.filter(function (marker) { return marker.region === region.id; });
    return {
      id: region.id,
      name: region.name,
      color: region.color,
      box: region.box,
      markerCount: inRegion.length,
      speciesCount: inRegion.reduce(function (sum, marker) { return sum + (marker.speciesCount || 0); }, 0)
    };
  }),
  categories: CATEGORIES,
  markers: markers
});

const summary = {};
markers.forEach(function (marker) { summary[marker.category] = (summary[marker.category] || 0) + 1; });
const regionSummary = {};
markers.forEach(function (marker) { regionSummary[marker.region] = (regionSummary[marker.region] || 0) + 1; });
console.log('map.json 生成完成：' + markers.length + ' 个点位 ' + JSON.stringify(summary));
console.log('区域分布：' + JSON.stringify(regionSummary));
