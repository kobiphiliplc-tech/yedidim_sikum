import type { Event, CategoryGroup, AppSettings, Category } from '@/lib/types'

export function groupEvents(events: Event[], categories: Category[] = []): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()

  for (const ev of events) {
    const key = `${ev.source_type}::${ev.category}`
    if (!map.has(key)) {
      map.set(key, {
        category: ev.category,
        source_type: ev.source_type,
        incidents: [],
        entries: [],
        total_incidents: 0,
        total_count: 0,
      })
    }
    const group = map.get(key)!

    if (ev.source_type === 'regular') {
      group.entries.push({ volunteer_name: ev.volunteer_name, count: ev.count })
      group.total_count += ev.count
    } else {
      // emergency or extra: group by incident_id, preserve insertion order
      const incidentId = ev.incident_id ?? ev.id
      const existing = group.incidents.find(i => i.incident_id === incidentId)
      if (existing) {
        existing.volunteers.push(ev.volunteer_name)
      } else {
        group.incidents.push({ incident_id: incidentId, volunteers: [ev.volunteer_name] })
        group.total_incidents++
      }
    }
  }

  const TYPE_ORDER: Record<string, number> = { regular: 0, extra: 1, emergency: 2 }

  const orderMap = new Map<string, number>()
  for (const cat of categories) {
    if (cat.display_order != null) {
      orderMap.set(`${cat.type}::${cat.name}`, cat.display_order)
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.source_type] ?? 9) - (TYPE_ORDER[b.source_type] ?? 9)
    if (typeDiff !== 0) return typeDiff
    const aOrder = orderMap.get(`${a.source_type}::${a.category}`) ?? Infinity
    const bOrder = orderMap.get(`${b.source_type}::${b.category}`) ?? Infinity
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.category.localeCompare(b.category, 'he')
  })
}

/**
 * Count unique volunteer names across all events (case-insensitive, trimmed).
 * Same name in two different categories = counted once.
 */
export function countUniqueVolunteers(events: Event[]): number {
  return new Set(events.map(e => e.volunteer_name.trim().toLowerCase())).size
}

/**
 * Count total incidents/entries:
 * - emergency/extra: each distinct incident = 1
 * - regular: each entry row = 1
 */
export function countTotalEvents(groups: CategoryGroup[]): number {
  return groups.reduce((sum, g) => {
    return g.source_type === 'regular'
      ? sum + g.total_count
      : sum + g.incidents.length
  }, 0)
}

/**
 * WhatsApp-style formatted summary.
 *
 * Emergency / Extra:
 *   *קטגוריה*
 *   1. מתנדב א, מתנדב ב
 *   2. מתנדב ג
 *
 * Regular:
 *   *קטגוריה 32*
 *   שם - מספר
 *
 * Header/footer templates support:
 *   {total_events}     — count of incidents/entries
 *   {total_volunteers} — unique volunteer names
 */
export function generateSummary(
  groups: CategoryGroup[],
  settings: AppSettings,
  totalUniqueVolunteers: number,
  totalEvents: number
): string {
  const nonEmpty = groups.filter(g =>
    g.source_type === 'regular' ? g.entries.length > 0 : g.incidents.length > 0
  )
  if (nonEmpty.length === 0) return ''

  function formatSection(group: CategoryGroup): string {
    if (group.source_type === 'regular') {
      const header = `*${group.category} ${group.total_count}*`
      const lines = group.entries.map(e => `${e.volunteer_name} - ${e.count}`)
      return [header, ...lines].join('\n')
    } else {
      const header = `*${group.category} ${group.total_incidents}*`
      const lines = group.incidents.map(
        (inc, i) => `${i + 1}. ${inc.volunteers.join(', ')}`
      )
      return [header, ...lines].join('\n')
    }
  }

  const emergencyCount = nonEmpty
    .filter(g => g.source_type === 'emergency')
    .reduce((sum, g) => sum + g.incidents.length, 0)

  function resolve(template: string): string {
    return template
      .replace(/\{total_events\}/g, String(totalEvents))
      .replace(/\{total_volunteers\}/g, String(totalUniqueVolunteers))
      .replace(/\{emergency_count\}/g, String(emergencyCount))
  }

  let emergencyHeaderInserted = false
  const sections: string[] = []
  for (const group of nonEmpty) {
    if (group.source_type === 'emergency' && !emergencyHeaderInserted) {
      if (settings.emergencyHeader.trim()) {
        sections.push(resolve(settings.emergencyHeader.trim()))
      }
      emergencyHeaderInserted = true
    }
    sections.push(formatSection(group))
  }

  const body = sections.join('\n\n')

  const parts: string[] = []
  if (settings.header.trim()) parts.push(resolve(settings.header.trim()))
  parts.push(body)
  if (settings.footer.trim()) parts.push(resolve(settings.footer.trim()))

  return parts.join('\n\n')
}
