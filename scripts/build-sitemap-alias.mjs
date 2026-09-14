/**
 * 生成对外统一入口 dist/sitemap.xml
 *
 *   node scripts/build-sitemap-alias.mjs
 *
 * @astrojs/sitemap 只输出 sitemap-index.xml + sitemap-0.xml，且文件名不可配置
 * （filenameBase 后面永远会拼上 -index / -0），所以对外需要一个稳定地址时，
 * 这里把插件的分片合并成单个标准 urlset：
 *
 *   <?xml version="1.0" encoding="UTF-8"?>
 *   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ...>
 *     <url><loc>完整 URL</loc>…</url>
 *   </urlset>
 *
 * 内容全部取自插件产物 —— 页面过滤、priority、changefreq、xhtml:link 语言互链
 * 都由 astro.config.mjs 里的 sitemap 配置决定，这里不再写第二套 URL 收集逻辑。
 * 合并后会做一次结构自检，不满足标准 urlset 就直接让构建失败。
 *
 * 必须在 astro build 之后运行（已挂在 npm run build 末尾）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

if (!existsSync(dist)) {
  console.error('dist/ 不存在，请先运行 npm run build');
  process.exit(1);
}

// 分片名由插件决定：sitemap-0.xml、sitemap-1.xml …（数量随 entryLimit 变化）
const chunks = readdirSync(dist)
  .filter(function (name) { return /^sitemap-\d+\.xml$/.test(name); })
  .sort(function (a, b) { return Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]); });

if (!chunks.length) {
  console.error('没有找到 sitemap-N.xml，@astrojs/sitemap 可能没有生成产物');
  process.exit(1);
}

let header = '';
const urls = [];
const seen = new Set();
let duplicates = 0;

chunks.forEach(function (name) {
  const xml = readFileSync(join(dist, name), 'utf8');
  const firstUrl = xml.indexOf('<url>');
  if (firstUrl === -1) {
    console.warn('跳过没有 <url> 的分片：' + name);
    return;
  }
  // 头部只取一次：保留插件的 XML 声明、xml-stylesheet 指令和命名空间
  if (!header) header = xml.slice(0, firstUrl).trimEnd();
  Array.from(xml.matchAll(/<url>[\s\S]*?<\/url>/g)).forEach(function (match) {
    const loc = match[0].match(/<loc>([^<]+)<\/loc>/);
    if (!loc) {
      console.warn('跳过没有 <loc> 的 <url> 块');
      return;
    }
    if (seen.has(loc[1])) {
      duplicates += 1;
      return;
    }
    seen.add(loc[1]);
    urls.push(match[0]);
  });
});

if (!urls.length) {
  console.error('sitemap 分片里没有任何 URL');
  process.exit(1);
}

// 头部兜底：极少数情况下插件产物可能没有声明，这里补齐成标准形式
if (header.indexOf('<?xml') !== 0) {
  header = '<?xml version="1.0" encoding="UTF-8"?>' + header;
}
if (header.indexOf('<urlset') === -1) {
  console.error('插件产物的头部里没有 <urlset>，无法合并：\n' + header.slice(0, 200));
  process.exit(1);
}

const output = header + '\n' + urls.join('\n') + '\n</urlset>\n';
writeFileSync(join(dist, 'sitemap.xml'), output, 'utf8');

// --- 结构自检：不满足标准 urlset 就让构建失败 ---
const problems = [];
if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(output)) {
  problems.push('缺少 XML 声明');
}
if (output.indexOf('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') === -1) {
  problems.push('缺少 sitemaps.org 命名空间');
}
if (!/<\/urlset>\s*$/.test(output)) {
  problems.push('没有以 </urlset> 收尾');
}
const urlTags = (output.match(/<url>/g) || []).length;
const locTags = (output.match(/<loc>/g) || []).length;
if (urlTags !== locTags) {
  problems.push('<url> 与 <loc> 数量不一致：' + urlTags + ' vs ' + locTags);
}
if (new Set(urls.map(function (block) { return block.match(/<loc>([^<]+)<\/loc>/)[1]; })).size !== urls.length) {
  problems.push('输出里仍有重复 URL');
}
if (problems.length) {
  console.error('sitemap.xml 结构自检失败：\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

if (duplicates) {
  console.warn('已去掉 ' + duplicates + ' 条重复 URL');
}
console.log('sitemap.xml 生成完成：' + urls.length + ' 个 URL（来自 ' + chunks.length + ' 个分片）');
