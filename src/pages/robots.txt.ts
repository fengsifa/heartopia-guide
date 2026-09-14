import type { APIRoute } from 'astro';
import siteInfo from '../data/site.json';

export const GET: APIRoute = ({ site }) => {
  const origin = site ? site.href.replace(/\/$/, '') : siteInfo.url;
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# 站内搜索结果由查询参数生成，避免搜索引擎抓取无限多的参数页',
    'Disallow: /*?q=',
    '',
    'Sitemap: ' + origin + '/sitemap-index.xml',
    ''
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
