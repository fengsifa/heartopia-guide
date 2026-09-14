/**
 * 站点语言配置。
 *
 * 只有两个语言：en（默认）与 zh。
 * 语言只出现在 URL 的第一段：/en/fish/bass/ 与 /zh/fish/bass/。
 * 页面对之间通过 hreflang 互相声明，canonical 指向自身语言版本。
 */
export const LOCALES = ['en', 'zh'];
export const DEFAULT_LOCALE = 'en';

export const HTML_LANG = { en: 'en', zh: 'zh-CN' };
export const OG_LOCALE = { en: 'en_US', zh: 'zh_CN' };
export const LOCALE_LABEL = { en: 'English', zh: '中文' };

// 用户手动选择语言后写入 localStorage 的键
export const LOCALE_STORAGE_KEY = 'heartopiahub:locale';

export function isLocale(value) {
  return LOCALES.indexOf(value) !== -1;
}

/** 把站内路径规范成带首尾斜杠的形式：fish/bass → /fish/bass/ */
export function normalizePath(path) {
  const value = String(path == null ? '/' : path);
  const withLeading = value.charAt(0) === '/' ? value : '/' + value;
  const collapsed = withLeading.replace(/\/{2,}/g, '/');
  return collapsed === '/' ? '/' : collapsed.replace(/\/+$/, '/');
}

/** 加上语言前缀：/fish/ → /en/fish/ */
export function localePath(locale, path) {
  const normalized = normalizePath(path);
  return '/' + locale + (normalized === '/' ? '/' : normalized);
}

/** 去掉语言前缀：/en/fish/ → /fish/ */
export function stripLocale(pathname) {
  const normalized = normalizePath(pathname);
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length && isLocale(parts[0])) parts.shift();
  if (!parts.length) return '/';
  return '/' + parts.join('/') + '/';
}

/** 同一页面在目标语言下的地址，供语言切换按钮使用 */
export function switchLocalePath(pathname, target) {
  return localePath(target, stripLocale(pathname));
}

/** 同一页面的全部语言版本，供 hreflang 使用 */
export function alternates(path) {
  return LOCALES.map(function (locale) {
    return { locale: locale, htmlLang: HTML_LANG[locale], href: localePath(locale, path) };
  });
}

export function otherLocales(locale) {
  return LOCALES.filter(function (value) { return value !== locale; });
}

// 列表分隔符：中文用顿号，英文用逗号加空格
export function listSeparator(locale) {
  return locale === 'zh' ? '、' : ', ';
}
