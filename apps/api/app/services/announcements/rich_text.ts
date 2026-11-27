import sanitizeHtml from 'sanitize-html'

/**
 * Rich text of the comunicados (docs/announcements.md). The editor of the
 * back-office produces HTML; the API keeps only this allowlist, so whatever
 * reaches the database is safe to render in the apps and in the email.
 */
const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    // Older editors and pasted content
    b: 'strong',
    i: 'em',
    strike: 's',
    del: 's',
    h1: 'h3',
    h2: 'h3',
    h4: 'h3',
    div: 'p',
    // Links open in a new tab and never pass the referrer
    a: (tagName, attribs) => ({
      tagName,
      attribs: { href: attribs.href ?? '', target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
  exclusiveFilter: (frame) => frame.tag === 'a' && !frame.attribs.href,
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Plain text (older comunicados, seeders) as paragraphs: a blank line separates them */
export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const EDGE_EMPTY_PARAGRAPHS = /^(\s*<p>(\s|<br\s*\/?>)*<\/p>)+|(<p>(\s|<br\s*\/?>)*<\/p>\s*)+$/g

/** The editor always wraps its content in a block; older plain text never starts with one */
const looksLikeHtml = (value: string) => /^<(p|h[1-6]|ul|ol|blockquote|div)[\s>]/i.test(value)

/**
 * The body as safe HTML: sanitized with the allowlist; plain text becomes
 * paragraphs. Empty content (an editor with nothing written) becomes ''.
 */
export function sanitizeBody(body: string | null | undefined) {
  const value = (body ?? '').trim()
  if (!value) return ''
  const html = sanitizeHtml(looksLikeHtml(value) ? value : textToHtml(value), ALLOWED)
    // Empty paragraphs the editor leaves at the start or the end
    .replace(EDGE_EMPTY_PARAGRAPHS, '')
    .trim()
  return htmlToText(html) ? html : ''
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Plain text of the body: emails' text part, list excerpts */
export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|h3|li|blockquote|ul|ol)>/gi, '\n')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) =>
      text.trim() === href.trim() ? text : `${text} (${href})`
    )
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
      if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)))
      return ENTITIES[code.toLowerCase()] ?? entity
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** First characters of the text, cut at a word */
export function excerptOf(html: string, max = 220) {
  const text = htmlToText(html).replace(/\s+/g, ' ')
  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

/** The body with inline styles, for email clients that ignore <style> */
export function emailHtml(html: string) {
  const styles: Record<string, string> = {
    p: 'margin:0 0 12px;',
    h3: 'margin:20px 0 8px;font-size:16px;',
    ul: 'margin:0 0 12px;padding-left:22px;',
    ol: 'margin:0 0 12px;padding-left:22px;',
    li: 'margin:0 0 4px;',
    blockquote:
      'margin:0 0 12px;padding:4px 0 4px 14px;border-left:3px solid #3cc8a8;color:#4a607a;',
    a: 'color:#1e3a5f;',
  }
  return sanitizeHtml(html, {
    ...ALLOWED,
    allowedAttributes: { 'a': ['href', 'style', 'target', 'rel'], '*': ['style'] },
    allowedStyles: undefined,
    transformTags: Object.fromEntries(
      Object.entries(styles).map(([tag, style]) => [
        tag,
        (tagName: string, attribs: sanitizeHtml.Attributes) => ({
          tagName,
          attribs: {
            ...attribs,
            style,
          },
        }),
      ])
    ),
  })
}
