import type { ParsedRow, Category, SourceType } from '@/lib/types'

/**
 * Parse emergency/extra-style text into structured rows.
 *
 * Matches category lines by both full name AND alias (if set).
 * Each time a category line appears = new incident (new incident_id).
 * Volunteers within the same incident share the same incident_id.
 *
 * Format:
 *   מעלית              ← alias for "לכודים במעלית"
 *   שמעון באך
 *   קובי פיליפ
 *
 *   חילוץ טבעת מאצבע  ← full name (no alias needed)
 *   לוי אפריאט
 *
 *   מעלית              ← second incident of the same category
 *   אלמוג והב
 */
export function parseEmergencyAndExtra(
  text: string,
  categories: Category[]
): ParsedRow[] {
  // Build lookup: alias OR name → { name, type }
  const lookup = new Map<string, { name: string; type: SourceType }>()
  for (const cat of categories) {
    if (cat.type !== 'emergency' && cat.type !== 'extra') continue
    lookup.set(cat.name.trim(), { name: cat.name, type: cat.type })
    if (cat.alias?.trim()) {
      lookup.set(cat.alias.trim(), { name: cat.name, type: cat.type })
    }
  }

  let activeCategory: { name: string; type: SourceType } | null = null
  let currentIncidentId: string | null = null
  const results: ParsedRow[] = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    const cat = lookup.get(line)
    if (cat) {
      activeCategory = cat
      currentIncidentId = crypto.randomUUID()
      continue
    }

    if (activeCategory && currentIncidentId) {
      results.push({
        _key: `ep-${results.length}`,
        category: activeCategory.name,
        volunteer_name: line,
        count: 1,
        source_type: activeCategory.type,
        incident_id: currentIncidentId,
      })
    }
  }

  return results
}
