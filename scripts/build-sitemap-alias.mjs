/**
 * 生成对外统一入口 dist/sitemap.xml
 *
 *   node scripts/build-sitemap-alias.mjs
 *
 * @astrojs/sitemap 只会输出 sitemap-index.xml + sitemap-0.xml（文件名不可配置），
 * 但 Google Search Console 提交和 robots.txt 声明都需要一个稳定的地址，
 * 所以这里把插件产出的所有分片合并成单个 sitemap.xml，沿用插件的命名空间和
 * <url> 结构（含 xhtml:link 语言互链），避免另写一套 URL 收集逻辑产生偏差。
 *
 * 合并内容完全来自插件产物：sitemap-index.xml 变、这里就跟着变。
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

// 分片名由插件决定：sitemap-0.xml、sitemap-1.xml …（分片数按 entryLimit 变化）
const chunks = readdirSync(dist)
  .filter(function (name) { return /^sitemap-\d+\.xml$/.test(name); })
  .sort(function (a, b) {
    return Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]);
  });

if (!chunks.length) {
  console.error('没有找到 sitemap-N.xml，@astrojs/sitemap 可能没有生成产物');
  process.exit(1);
}

let header = '';
const blocks = [];
chunks.forEach(function (name) {
  const xml = readFileSync(join(dist, name), 'utf8');
  const firstUrl = xml.indexOf('<url>');
  if (firstUrl === -1) {
    console.warn('跳过没有 <url> 的分片：' + name);
    return;
  }
  // 头部只取一次，保证命名空间（含 xhtml）和插件完全一致
  if (!header) header = xml.slice(0, firstUrl).trimEnd();
  Array.from(xml.matchAll(/<url>[\s\S]*?<\/url>/g)).forEach(function (match) {
    blocks.push(match[0]);
  });
});

if (!blocks.length) {
  console.error('sitemap 分片里没有任何 URL');
  process.exit(1);
}

writeFileSync(
  join(dist, 'sitemap.xml'),
  header + '\n' + blocks.join('\n') + '\n</urlset>\n',
  'utf8'
);

// 分片数 > 1 时 sitemap-index.xml 仍然是给爬虫的首选入口，这里一并保留
console.log('sitemap.xml 生成完成：' + blocks.length + ' 个 URL（来自 ' + chunks.length + ' 个分片）');
