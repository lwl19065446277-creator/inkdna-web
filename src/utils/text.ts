export function isCjk(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  )
}

export function isAlphanumeric(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x0041 && code <= 0x005a) ||
    (code >= 0x0061 && code <= 0x007a) ||
    (code >= 0x0030 && code <= 0x0039)
  )
}

export function isPunctuation(char: string): boolean {
  const punctuations = new Set([
    ' ', '\t', '\n', '\r',
    '\uFF0C', '\u3002', '\uFF01', '\uFF1F', '\u3001', '\uFF1B', '\uFF1A',
    '\u300C', '\u300D', '\u300E', '\u300F',
    '\u201C', '\u201D', '\u2018', '\u2019',
    '\uFF08', '\uFF09', '\u300A', '\u300B',
    '\u2014\u2014', '\u2026\u2026',
    ',', '.', '!', '?', ';', ':', '"', "'", '(', ')', '-', '_',
    '+', '=', '*', '&', '^', '%', '$', '#', '@', '~', '`',
    '/', '\\', '|', '[', ']', '{', '}', '<', '>', '\u00B7', '\u2014'
  ])
  return punctuations.has(char)
}

export function toUnicode(char: string): string {
  const code = char.charCodeAt(0)
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}

export interface ExtractOptions {
  includeAlphanumeric?: boolean
  excludePunctuation?: boolean
  excludeSpaces?: boolean
}

export function extractUniqueChars(
  text: string,
  options: ExtractOptions = {}
): string[] {
  const {
    includeAlphanumeric = false,
    excludePunctuation = true,
    excludeSpaces = true
  } = options

  const seen = new Set<string>()
  const result: string[] = []

  for (const char of text) {
    if (excludeSpaces && (char === ' ' || char === '\t' || char === '\n' || char === '\r')) {
      continue
    }
    if (excludePunctuation && isPunctuation(char)) {
      continue
    }
    if (isCjk(char) || (includeAlphanumeric && isAlphanumeric(char))) {
      if (!seen.has(char)) {
        seen.add(char)
        result.push(char)
      }
    }
  }

  return result
}

export function countChars(text: string): {
  total: number
  unique: number
  uniqueCjk: number
  pending: number
} {
  const uniqueChars = extractUniqueChars(text)
  const uniqueCjk = uniqueChars.filter(c => isCjk(c)).length
  return {
    total: text.length,
    unique: uniqueChars.length,
    uniqueCjk,
    pending: uniqueChars.length
  }
}

export interface GlyphManifestRow {
  char: string
  unicode: string
  source_type: string
  status: string
  image_path: string
  review_notes: string
}

export function buildGlyphManifestCsv(chars: string[]): string {
  const headers = ['char', 'unicode', 'source_type', 'status', 'image_path', 'review_notes']
  const rows: GlyphManifestRow[] = chars.map(char => ({
    char,
    unicode: toUnicode(char),
    source_type: 'manual_capture_needed',
    status: 'pending',
    image_path: '',
    review_notes: ''
  }))

  const escapeCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"'
    }
    return val
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push([
      escapeCsv(row.char),
      escapeCsv(row.unicode),
      escapeCsv(row.source_type),
      escapeCsv(row.status),
      escapeCsv(row.image_path),
      escapeCsv(row.review_notes)
    ].join(','))
  }

  return lines.join('\n')
}
