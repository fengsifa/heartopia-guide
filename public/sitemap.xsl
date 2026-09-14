<?xml version="1.0" encoding="UTF-8"?>
<!--
  sitemap.xml 的浏览器样式表。
  Google 会忽略 xml-stylesheet 指令，它只影响人用浏览器打开 sitemap 时的显示效果：
  没有它的时候，部分浏览器会把 <url>/<loc> 当成未知 HTML 标签吞掉，
  页面看起来就是一堆粘在一起的纯文本 URL。
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="sm xhtml">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>sitemap.xml — HeartopiaHub</title>
        <style>
          :root { color-scheme: light dark; }
          body { margin: 0; padding: 24px 16px 48px; font: 14px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
          .wrap { max-width: 1100px; margin: 0 auto; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          p.sub { margin: 0 0 18px; opacity: .7; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border-bottom: 1px solid rgba(128,128,128,.3); padding: 6px 8px; text-align: left; vertical-align: top; }
          th { position: sticky; top: 0; background: Canvas; font-weight: 600; }
          td.num { text-align: right; opacity: .6; white-space: nowrap; }
          td.url { word-break: break-all; }
          td.url a { text-decoration: none; }
          td.url a:hover { text-decoration: underline; }
          .lang { white-space: nowrap; opacity: .75; font-size: 12px; }
          .lang span + span::before { content: " · "; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>HeartopiaHub — sitemap.xml</h1>
          <p class="sub">
            <xsl:value-of select="count(sm:urlset/sm:url)" /> URLs (English + Chinese)
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>URL</th>
                <th>Changefreq</th>
                <th>Priority</th>
                <th>Alternates</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sm:urlset/sm:url">
                <tr>
                  <td class="num"><xsl:value-of select="position()" /></td>
                  <td class="url"><a href="{sm:loc}"><xsl:value-of select="sm:loc" /></a></td>
                  <td><xsl:value-of select="sm:changefreq" /></td>
                  <td><xsl:value-of select="sm:priority" /></td>
                  <td class="lang">
                    <xsl:for-each select="xhtml:link">
                      <span><xsl:value-of select="@hreflang" /></span>
                    </xsl:for-each>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>

  <!-- sitemap-index.xml 也引用同一份样式表，这里给它一个对应的展示 -->
  <xsl:template match="/sm:sitemapindex">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>sitemap-index.xml — HeartopiaHub</title>
        <style>
          body { margin: 0; padding: 24px 16px 48px; font: 14px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
          .wrap { max-width: 900px; margin: 0 auto; }
          h1 { font-size: 20px; margin: 0 0 18px; }
          li { word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>HeartopiaHub — sitemap-index.xml</h1>
          <ul>
            <xsl:for-each select="sm:sitemap">
              <li><a href="{sm:loc}"><xsl:value-of select="sm:loc" /></a></li>
            </xsl:for-each>
          </ul>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
