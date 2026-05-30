import type { ParsedRow } from '@/lib/types'

export interface VolunteerTotal {
  name: string
  count: number
}

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

const VOLUNTEER_TOTAL_RE = /^(.+?)\s+(\d+)$/

/**
 * Extract the pre-computed volunteer totals section from a weekly report.
 * Looks for a line matching sectionHeader (strips ** markdown), then parses
 * "name count" lines (space-separated, no dash) until a non-matching line.
 */
export function parseVolunteerTotals(
  text: string,
  sectionHeader: string = 'רשימת כל המתנדבים שיצאו לסייע:'
): VolunteerTotal[] {
  const stripBold = (s: string) => s.replace(/\*\*/g, '').trim()
  const headerNorm = stripBold(sectionHeader)
  const lines = text.split('\n')
  let inSection = false
  const results: VolunteerTotal[] = []

  for (const raw of lines) {
    const line = stripBold(raw)

    if (!inSection) {
      if (!line) continue
      if (line === headerNorm || line.endsWith(headerNorm)) inSection = true
      continue
    }

    if (!line) continue

    const match = VOLUNTEER_TOTAL_RE.exec(line)
    if (match) {
      const name = match[1].trim()
      const count = parseInt(match[2], 10)
      if (name && count > 0) results.push({ name, count })
    } else {
      break
    }
  }

  return results
}
