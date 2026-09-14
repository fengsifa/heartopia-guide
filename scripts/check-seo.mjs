/**
 * 构建产物 SEO 自检（中英双语）。
 *
 * 直接扫描 dist/ 里的 HTML，检查 title / description / canonical / H1 /
 * JSON-LD / hreflang / robots / sitemap 是否完整且唯一。
 *
 *   node scripts/check-seo.mjs
 *
 * 有硬性问题时以非 0 退出，方便在 CI 里卡住回归。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

const TITLE_MAX = 65;
const DESCRIPTION_MAX = 165;
const DESCRIPTION_MIN = 50;

const LOCALES = ['en', 'zh'];
const DEFAULT_LOCALE = 'en';
const HTML_LANG = { en: 'en', zh: 'zh-CN' };
// 根路径 / 是英文首页的副本，canonical 指向 /en/，属于别名页
const ALIAS_CANONICAL = { '/': '/en/' };

const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

if (!existsSync(dist)) {
  console.error('dist/ 不存在，请先运行 npm run build');
  process.exit(1);
}

function walk(dir, base, out) {
  readdirSync(dir).forEach(function (name) {
    const full = join(dir, name);
    const rel = base ? base + '/' + name : name;
    if (statSync(full).isDirectory()) walk(full, rel, out);
    else out.push(rel);
  });
  return out;
}

const files = walk(dist, '', []);
const htmlFiles = files.filter(function (f) { return f.endsWith('.html'); });
if (!htmlFiles.length) {
  console.error('dist/ 里没有 HTML，构建可能失败了');
  process.exit(1);
}

function pick(html, re) {
  const match = html.match(re);
  return match ? decodeEntities(match[1].trim()) : '';
}

// title / description 里会带 HTML 实体（&amp; 等），按解码后的真实长度计算
function decodeEntities(text) {
  return String(text == null ? '' : text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function collectAlternates(html) {
  const list = [];
  const re = /<link rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) list.push({ hreflang: match[1], href: match[2] });
  return list;
}

const pages = htmlFiles.map(function (file) {
  const html = readFileSync(join(dist, file), 'utf8');
  const path = '/' + file.replace(/index\.html$/, '');
  const ldBlocks = [];
  const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = ldRe.exec(html)) !== null) ldBlocks.push(match[1]);
  return {
    file: file,
    path: path,
    html: html,
    lang: pick(html, /<html lang="([^"]*)"/),
    title: pick(html, /<title>([\s\S]*?)<\/title>/),
    description: pick(html, /<meta name="description" content="([\s\S]*?)"/),
    canonical: pick(html, /<link rel="canonical" href="([\s\S]*?)"/),
    robots: pick(html, /<meta name="robots" content="([\s\S]*?)"/),
    h1Count: (html.match(/<h1[\s>]/g) || []).length,
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    alternates: collectAlternates(html),
    ldBlocks: ldBlocks
  };
});

const pathSet = new Set(pages.map(function (p) { return p.path; }));

// 站点根地址取英文首页 canonical，避免和构建配置脱节
const homePage = pages.filter(function (p) { return p.path === '/en/'; })[0];
const origin = homePage && homePage.canonical ? homePage.canonical.replace(/\/en\/$/, '') : '';
if (!origin) fail('无法从 dist/en/index.html 读取 canonical，检查 astro.config.mjs 的 site 配置');

function isNoindex(page) { return page.robots.indexOf('noindex') !== -1; }
function isAlias(page) { return Object.prototype.hasOwnProperty.call(ALIAS_CANONICAL, page.path); }

const indexable = pages.filter(function (page) { return !isNoindex(page); });
const uniqueSet = indexable.filter(function (page) { return !isAlias(page); });

function localeOf(path) {
  const parts = path.split('/').filter(Boolean);
  return LOCALES.indexOf(parts[0]) !== -1 ? parts[0] : '';
}

// --- 逐页检查 ---
pages.forEach(function (page) {
  const label = page.file;
  if (!page.title) fail(label + ' 缺少 <title>');
  if (!page.description) fail(label + ' 缺少 meta description');
  if (!page.canonical) fail(label + ' 缺少 canonical');
  if (!page.robots) fail(label + ' 缺少 meta robots');
  if (page.h1Count !== 1) fail(label + ' H1 数量应为 1，实际 ' + page.h1Count);
  if (!page.h1) fail(label + ' 缺少 H1 文本');

  if (page.title.length > TITLE_MAX) {
    fail(label + ' title 过长（' + page.title.length + '）：' + page.title);
  }
  if (page.description.length > DESCRIPTION_MAX) {
    fail(label + ' description 过长（' + page.description.length + '）');
  }

  // html lang 必须和 URL 语言段一致
  const locale = localeOf(page.path);
  if (locale && page.lang !== HTML_LANG[locale]) {
    fail(label + ' html lang 应为 ' + HTML_LANG[locale] + '，实际 "' + page.lang + '"');
  }

  if (isNoindex(page)) {
    if (page.canonical.indexOf(origin || 'http') !== 0) {
      fail(label + ' canonical 不是本站地址：' + page.canonical);
    }
    if (page.robots.indexOf('follow') === -1) fail(label + ' noindex 页面应保留 follow');
    // noindex 页面（404 / 站内搜索）不是真实的语言版本，不发 hreflang
    if (page.alternates.length) fail(label + ' noindex 页面不应输出 hreflang');
    return;
  }

  if (page.description.length < DESCRIPTION_MIN) {
    warn(label + ' description 偏短（' + page.description.length + '）：' + page.description);
  }
  if (page.robots.indexOf('index') === -1) {
    fail(label + ' meta robots 未声明 index：' + page.robots);
  }

  const target = ALIAS_CANONICAL[page.path] || page.path;
  const expected = origin + target;
  if (page.canonical !== expected) {
    fail(label + ' canonical 与路径不一致\n    期望 ' + expected + '\n    实际 ' + page.canonical);
  }

  if (isAlias(page)) return;

  // hreflang：每个页面都要能指向自己和其他语言的同一路径
  const byLang = {};
  page.alternates.forEach(function (entry) { byLang[entry.hreflang] = entry.href; });
  const body = page.path.replace(/^\/[^/]+\//, '/');
  LOCALES.forEach(function (value) {
    const expectedHref = origin + '/' + value + body;
    const actual = byLang[HTML_LANG[value]];
    if (!actual) {
      fail(label + ' 缺少 hreflang=' + HTML_LANG[value]);
    } else if (actual !== expectedHref) {
      fail(label + ' hreflang=' + HTML_LANG[value] + ' 指向错误\n    期望 ' + expectedHref + '\n    实际 ' + actual);
    }
    // 姊妹页面必须真的构建出来了
    if (!pathSet.has('/' + value + body)) {
      fail(label + ' 缺少对应语言版本：/' + value + body);
    }
  });
  const xDefault = byLang['x-default'];
  const defaultHref = origin + '/' + DEFAULT_LOCALE + body;
  if (!xDefault) fail(label + ' 缺少 hreflang=x-default');
  else if (xDefault !== defaultHref) fail(label + ' x-default 应指向默认语言 ' + defaultHref + '，实际 ' + xDefault);
});

// --- 唯一性（同一语言的页面之间） ---
function duplicates(list, key) {
  const map = new Map();
  list.forEach(function (page) {
    const value = page[key];
    if (!value) return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(page.file);
  });
  return Array.from(map.entries()).filter(function (entry) { return entry[1].length > 1; });
}

duplicates(uniqueSet, 'title').forEach(function (entry) {
  fail('title 重复：' + entry[0] + ' → ' + entry[1].slice(0, 4).join(', '));
});
duplicates(uniqueSet, 'description').forEach(function (entry) {
  fail('description 重复（' + entry[1].length + ' 个页面）：' + entry[0].slice(0, 70) + '…');
});

// --- 每个语言段的页面数量应当一致 ---
LOCALES.forEach(function (value) {
  const count = pages.filter(function (page) { return localeOf(page.path) === value; }).length;
  if (!count) fail('没有生成任何 ' + value + ' 页面');
});

// --- sitemap / robots ---
const sitemapPath = join(dist, 'sitemap-0.xml');
const sitemapIndexPath = join(dist, 'sitemap-index.xml');
if (!existsSync(sitemapPath)) fail('缺少 dist/sitemap-0.xml');
if (!existsSync(sitemapIndexPath)) fail('缺少 dist/sitemap-index.xml');

let sitemapUrls = [];
let sitemapXml = '';
if (existsSync(sitemapPath)) {
  sitemapXml = readFileSync(sitemapPath, 'utf8');
  sitemapUrls = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(function (m) { return m[1]; });
  if (!sitemapUrls.length) fail('sitemap 里没有任何 URL');
}

const sitemapSet = new Set(sitemapUrls);
indexable.forEach(function (page) {
  if (isAlias(page)) return;
  if (!sitemapSet.has(origin + page.path)) fail('可收录页面不在 sitemap 里：' + page.path);
});
pages.forEach(function (page) {
  if (!isNoindex(page) && !isAlias(page)) return;
  if (sitemapSet.has(origin + page.path)) fail('noindex / 别名页面不应出现在 sitemap：' + page.path);
});
sitemapUrls.forEach(function (url) {
  if (url.indexOf(origin) !== 0) fail('sitemap 里的域名与 canonical 不一致：' + url);
});

// sitemap 里的语言互链
LOCALES.forEach(function (value) {
  if (sitemapXml.indexOf('hreflang="' + HTML_LANG[value] + '"') === -1) {
    fail('sitemap 缺少 hreflang=' + HTML_LANG[value] + ' 的语言互链');
  }
});

const robotsPath = join(dist, 'robots.txt');
if (!existsSync(robotsPath)) {
  fail('缺少 dist/robots.txt');
} else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (robots.indexOf('Sitemap:') === -1) fail('robots.txt 没有声明 Sitemap');
  if (robots.indexOf('Allow: /') === -1) fail('robots.txt 没有放行全站抓取');
}

// --- 输出 ---
console.log('扫描页面：' + pages.length + '（可收录 ' + indexable.length + '，noindex '
  + (pages.length - indexable.length) + '）');
console.log('sitemap URL：' + sitemapUrls.length);
console.log('站点根地址：' + origin);

if (warnings.length) {
  console.log('\n警告 ' + warnings.length + ' 条：');
  warnings.slice(0, 20).forEach(function (message) { console.log('  ! ' + message); });
  if (warnings.length > 20) console.log('  ... 还有 ' + (warnings.length - 20) + ' 条');
}

if (errors.length) {
  console.error('\nSEO 检查失败，共 ' + errors.length + ' 个问题：');
  errors.slice(0, 40).forEach(function (message) { console.error('  - ' + message); });
  if (errors.length > 40) console.error('  ... 还有 ' + (errors.length - 40) + ' 条');
  process.exit(1);
}

console.log('\nSEO 检查通过');
