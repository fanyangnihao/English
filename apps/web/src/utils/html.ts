import DOMPurify from 'dompurify'

const HTML_OPTIONS = {
  FORBID_TAGS: ['form', 'iframe', 'input', 'object', 'script', 'style'],
  FORBID_ATTR: ['style'],
}

export const sanitizeHtml = (html: string | null | undefined) =>
  DOMPurify.sanitize(html ?? '', HTML_OPTIONS)
