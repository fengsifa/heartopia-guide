import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionConfigs } from '../src/lib/collections-config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'src', 'data');

const problems = [];

function read(name) {
  try {
    return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
  } catch (error) {
    problems.push(name + ': 无法解析 JSON — ' + error.message);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) problems.push(message);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isArray(value) {
  return Array.isArray(value);
}

function checkList(label, list, spec) {
  if (!isArray(list)) {
    assert(false, label + ': 应为数组');
    return;
  }
  const seen = new Set();
  list.forEach(function (item, index) {
    const where = label + '[' + index + '] ' + (item && item.slug ? '(' + item.slug + ')' : '');
    if (spec.slug) {
      assert(nonEmptyString(item.slug), where + '缺少 slug');
      if (nonEmptyString(item.slug)) {
        assert(!seen.has(item.slug), where + 'slug 重复：' + item.slug);
        seen.add(item.slug);
      }
    }
    (spec.required || []).forEach(function (field) {
      assert(item[field] !== undefined && item[field] !== null && item[field] !== '', where + '缺少字段 ' + field);
    });
    (spec.strings || []).forEach(function (field) {
      assert(nonEmptyString(item[field]), where + '字段 ' + field + ' 应为非空字符串');
    });
    (spec.arrays || []).forEach(function (field) {
      assert(isArray(item[field]), where + '字段 ' + field + ' 应为数组');
    });
    (spec.numbers || []).forEach(function (field) {
      assert(typeof item[field] === 'number' && Number.isFinite(item[field]), where + '字段 ' + field + ' 应为数字');
    });
    (spec.objects || []).forEach(function (entry) {
      assert(isArray(item[entry.field]), where + '字段 ' + entry.field + ' 应为数组');
      if (isArray(item[entry.field])) {
        item[entry.field].forEach(function (child, childIndex) {
          entry.keys.forEach(function (key) {
            assert(
              child && child[key] !== undefined && child[key] !== '',
              where + '.' + entry.field + '[' + childIndex + '] 缺少 ' + key
            );
          });
        });
      }
    });
    if (spec.oneOf) {
      Object.keys(spec.oneOf).forEach(function (field) {
        assert(
          spec.oneOf[field].indexOf(item[field]) !== -1,
          where + '字段 ' + field + ' 取值非法：' + item[field]
        );
      });
    }
  });
}

const site = read('site.json');
if (site) {
  assert(nonEmptyString(site.name), 'site.json 缺少 name');
  assert(nonEmptyString(site.url), 'site.json 缺少 url');
  assert(isArray(site.modules) && site.modules.length > 0, 'site.json 的 modules 应为非空数组');
  (site.modules || []).forEach(function (mod, index) {
    ['id', 'name', 'path', 'icon', 'desc'].forEach(function (key) {
      assert(nonEmptyString(mod[key]), 'site.json modules[' + index + '] 缺少 ' + key);
    });
    assert(/^\//.test(mod.path || ''), 'site.json modules[' + index + '] path 应以 / 开头');
  });
}

checkList('codes.json', read('codes.json'), {
  strings: ['code', 'reward'],
  oneOf: { status: ['active', 'limited', 'expired'] }
});

checkList('recipes.json', read('recipes.json'), {
  slug: true,
  strings: ['name', 'category'],
  numbers: ['sellPrice'],
  arrays: ['steps', 'tips'],
  objects: [{ field: 'ingredients', keys: ['item', 'qty'] }]
});

checkList('fish.json', read('fish.json'), {
  slug: true,
  strings: ['name', 'description'],
  numbers: ['price'],
  arrays: ['location', 'time', 'weather', 'season', 'size', 'tips']
});

checkList('money.json', read('money.json'), {
  slug: true,
  strings: ['title', 'summary', 'difficulty', 'incomePerHour', 'timeRequired'],
  arrays: ['requirements', 'steps', 'tips']
});

checkList('beginner.json', read('beginner.json'), {
  slug: true,
  strings: ['title', 'summary', 'category', 'readTime'],
  arrays: ['tips'],
  objects: [{ field: 'sections', keys: ['heading', 'body'] }]
});

checkList('farming.json', read('farming.json'), {
  slug: true,
  strings: ['name', 'season', 'growthTime'],
  numbers: ['seedCost', 'sellPrice', 'profit'],
  arrays: ['tips']
});

const map = read('map.json');
if (map) {
  assert(isArray(map.regions) && map.regions.length > 0, 'map.json 缺少 regions');
  assert(isArray(map.categories) && map.categories.length > 0, 'map.json 缺少 categories');
  const regionIds = (map.regions || []).map(function (r) { return r.id; });
  const categoryIds = (map.categories || []).map(function (c) { return c.id; });
  (map.regions || []).forEach(function (region, index) {
    ['id', 'name', 'color'].forEach(function (key) {
      assert(nonEmptyString(region[key]), 'map.json regions[' + index + '] 缺少 ' + key);
    });
  });
  (map.categories || []).forEach(function (category, index) {
    ['id', 'name', 'icon'].forEach(function (key) {
      assert(nonEmptyString(category[key]), 'map.json categories[' + index + '] 缺少 ' + key);
    });
  });
  assert(isArray(map.markers) && map.markers.length > 0, 'map.json 缺少 markers');
  const markerIds = new Set();
  (map.markers || []).forEach(function (marker, index) {
    const where = 'map.json markers[' + index + '] ' + (marker.id || '');
    ['id', 'name', 'description'].forEach(function (key) {
      assert(nonEmptyString(marker[key]), where + ' 缺少 ' + key);
    });
    assert(!markerIds.has(marker.id), where + ' id 重复');
    markerIds.add(marker.id);
    assert(regionIds.indexOf(marker.region) !== -1, where + ' region 未定义：' + marker.region);
    assert(categoryIds.indexOf(marker.category) !== -1, where + ' category 未定义：' + marker.category);
    assert(typeof marker.x === 'number' && marker.x >= 0 && marker.x <= 100, where + ' x 应为 0-100 的数字');
    assert(typeof marker.y === 'number' && marker.y >= 0 && marker.y <= 100, where + ' y 应为 0-100 的数字');
  });
}

// 通用图鉴模块：字段约定见 src/lib/collections-config.mjs 顶部注释
collectionConfigs.forEach(function (config) {
  const items = read(config.dataFile);
  checkList(config.dataFile, items, {
    slug: true,
    strings: ['name', 'description'],
    numbers: ['price'],
    arrays: ['location', 'time', 'weather', 'tips', 'facts']
  });
  if (!isArray(items)) return;
  items.forEach(function (item, index) {
    const where = config.dataFile + '[' + index + '] ' + (item.slug || '');
    if (isArray(item.facts)) {
      item.facts.forEach(function (fact, factIndex) {
        assert(
          fact && nonEmptyString(fact.label) && nonEmptyString(fact.value),
          where + '.facts[' + factIndex + '] 缺少 label / value'
        );
      });
    }
  });
});

if (problems.length === 0) {
  console.log('data check passed');
} else {
  console.error('data check failed with ' + problems.length + ' problem(s):');
  problems.slice(0, 40).forEach(function (problem) { console.error('  - ' + problem); });
  if (problems.length > 40) console.error('  ... 还有 ' + (problems.length - 40) + ' 条');
  process.exit(1);
}
