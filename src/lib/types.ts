export type WeekStatus = 'active' | 'closed'
export type SourceType = 'emergency' | 'regular' | 'extra'

export interface Week {
  id: string
  created_at: string
  status: WeekStatus
}

export interface Category {
  id: string
  name: string        // full display name (shown in WhatsApp message)
  alias: string | null  // optional short name used in pasted text
  type: SourceType
}

export interface Event {
  id: string
  week_id: string
  category: string        // full display name
  volunteer_name: string
  count: number
  source_type: SourceType
  incident_id: string | null  // groups volunteers from the same call together
  created_at: string
}

export interface ParsedRow {
  _key: string
  category: string
  volunteer_name: string
  count: number
  source_type: SourceType
  incident_id: string   // shared within the same incident block
}

export interface Incident {
  incident_id: string
  volunteers: string[]
}

export interface CategoryGroup {
  category: string
  source_type: SourceType
  incidents: Incident[]  // used for emergency + extra (numbered output)
  entries: Array<{ volunteer_name: string; count: number }>  // used for regular
  total_incidents: number  // count of distinct incidents (emergency/extra)
  total_count: number      // sum of counts (regular)
}

export interface AppSettings {
  header: string
  footer: string
  emergencyHeader: string
}
