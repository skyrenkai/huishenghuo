import sanitizeHtml from 'sanitize-html'

// 图文新闻的 HTML 过滤：只保留排版用的标签和样式，去掉脚本、表单、外部嵌入等不安全内容
const SIZE = /^\d+(\.\d+)?(px|em|rem|%|pt)?$/
const SPACING = /^(-?\d+(\.\d+)?(px|em|rem|%|pt)?|auto)(\s+(-?\d+(\.\d+)?(px|em|rem|%|pt)?|auto)){0,3}$/
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i

export function sanitizeNewsHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'div', 'section', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption',
      'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https', 'http'],
    allowedSchemesByTag: { img: ['https'] },
    allowedStyles: {
      '*': {
        color: [COLOR],
        'background-color': [COLOR],
        'font-size': [SIZE],
        'font-weight': [/^(normal|bold|bolder|lighter|\d{3})$/],
        'font-style': [/^(normal|italic)$/],
        'text-align': [/^(left|right|center|justify)$/],
        'text-decoration': [/^[a-z\s-]+$/],
        'text-decoration-line': [/^[a-z\s-]+$/],
        'text-indent': [SIZE],
        'line-height': [SIZE],
        'letter-spacing': [SIZE],
        margin: [SPACING], 'margin-top': [SPACING], 'margin-bottom': [SPACING],
        'margin-left': [SPACING], 'margin-right': [SPACING],
        padding: [SPACING], 'padding-top': [SPACING], 'padding-bottom': [SPACING],
        'padding-left': [SPACING], 'padding-right': [SPACING],
        border: [/^[\w\s#().,%-]+$/], 'border-left': [/^[\w\s#().,%-]+$/],
        'border-radius': [SPACING],
      },
    },
    transformTags: {
      // 外部链接在新窗口打开，且不把本站信息带过去
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } }),
    },
  } as sanitizeHtml.IOptions)
}
