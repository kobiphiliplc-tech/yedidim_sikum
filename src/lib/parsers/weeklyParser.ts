import type { ParsedRow } from '@/lib/types'

const SKIP_PATTERNS = [
  /^רשימת כל המתנדבים/,
  /^סה"כ/,
  /^סהכ/,
  /^סך הכל/,
  /^Total/i,
]

const VOLUNTEER_LINE_RE = /^(.+?)\s*-\s*(\d+)$/

/**
 * Parse weekly-stats-style text into structured rows.
 * Categories auto-detected from lines ending with ":".
 *
 * Format:
 *   פנצ'ר:
 *
 *   לוי אפריאט - 19
 *   יאיר שוקרון - 13
 */
export function parseWeekly(text: string): ParsedRow[] {
  const lines = text.split('\n')
  const results: ParsedRow[] = []
  let activeCategory: string | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (SKIP_PATTERNS.some(p => p.test(line))) continue

    if (line.endsWith(':')) {
      activeCategory = line.slice(0, -1).trim()
      continue
    }

    const match = VOLUNTEER_LINE_RE.exec(line)
    if (match && activeCategory !== null) {
      const name = match[1].trim()
      const count = parseInt(match[2], 10)
      if (name && count > 0) {
        results.push({
          _key: `wp-${results.length}`,
          category: activeCategory,
          volunteer_name: name,
          count,
          source_type: 'regular',
          incident_id: crypto.randomUUID(),
        })
      }
    }
  }

  return results
}
