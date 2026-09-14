import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// 站点域名只有一个来源：环境变量 SITE_URL 优先，其次 src/data/site.json
const siteInfo = JSON.parse(readFileSync(new URL('./src/data/site.json', import.meta.url), 'utf8'));
const site = process.env.SITE_URL || siteInfo.url;

// 语言只写在 URL 第一段：/en/... 与 /zh/...，默认语言也带前缀
const LOCALES = ['en', 'zh'];
const DEFAULT_LOCALE = 'en';

// 不进入 sitemap 的路径：
//   /                根路径是英文首页的副本，canonical 已指向 /en/，避免重复收录
//   /{locale}/search/ 纯前端工具页，内容完全由查询参数决定
function excluded(pathname) {
  if (pathname === '/') return true;
  return /^\/(en|zh)\/search\/$/.test(pathname);
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false }
  },
  integrations: [
    sitemap({
      // 让 sitemap 里的每个 URL 都带上 xhtml:link 语言互链
      // 注意 @astrojs/sitemap 的 locales 是「locale → hreflang」的记录，不是数组
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: { en: 'en', zh: 'zh-CN' } },
      filter: (page) => !excluded(new URL(page).pathname),
      serialize: (item) => {
        const parts = new URL(item.url).pathname.split('/').filter(Boolean);
        if (parts.length && LOCALES.indexOf(parts[0]) !== -1) parts.shift();
        const depth = parts.length;
        item.changefreq = depth === 0 ? 'daily' : depth === 1 ? 'weekly' : 'monthly';
        item.priority = depth === 0 ? 1 : depth === 1 ? 0.8 : 0.6;
        return item;
      }
    })
  ],
  build: { inlineStylesheets: 'auto' }
});
