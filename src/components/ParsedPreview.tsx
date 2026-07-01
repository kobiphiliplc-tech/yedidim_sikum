'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Tag } from 'lucide-react'
import type { ParsedRow } from '@/lib/types'

interface Props {
  rows: ParsedRow[]
  onRowsChange: (rows: ParsedRow[]) => void
  onSave: () => Promise<void>
  onDiscard: () => void
  saving: boolean
}

export function ParsedPreview({ rows, onRowsChange, onSave, onDiscard, saving }: Props) {
  function updateCategory(key: string, value: string) {
    const row = rows.find(r => r._key === key)
    if (!row) return
    onRowsChange(rows.map(r =>
      r.incident_id === row.incident_id ? { ...r, category: value } : r
    ))
  }

  function updateRow(key: string, field: keyof Omit<ParsedRow, '_key' | 'source_type' | 'category'>, value: string | number) {
    onRowsChange(rows.map(r => (r._key === key ? { ...r, [field]: value } : r)))
  }

  function deleteRow(key: string) {
    onRowsChange(rows.filter(r => r._key !== key))
  }

  // Promotes a volunteer row to be a new category boundary.
  // Rows from this row onward (within the same incident) get a new incident + the row's name as category.
  // The promoted row itself is removed (it was the category label, not a volunteer).
  function promoteToCategory(key: string) {
    const row = rows.find(r => r._key === key)
    if (!row) return

    const newIncidentId = crypto.randomUUID()
    const newCategory = row.volunteer_name
    const incidentKeys = rows
      .filter(r => r.incident_id === row.incident_id)
      .map(r => r._key)
    const splitIdx = incidentKeys.indexOf(key)

    const keysToPromote = new Set(incidentKeys.slice(splitIdx + 1))

    onRowsChange(
      rows
        .filter(r => r._key !== key)
        .map(r => {
          if (!keysToPromote.has(r._key)) return r
          return { ...r, category: newCategory, incident_id: newIncidentId }
        })
    )
  }

  if (rows.length === 0) return null

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">
            תצוגה מקדימה
            <span className="mr-2 text-xs font-normal text-muted-foreground">
              ({rows.length} שורות)
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDiscard} disabled={saving}>
              בטל
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving || rows.length === 0}>
              {saving ? 'שומר...' : `שמור ${rows.length} שורות`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">קטגוריה</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">שם מתנדב</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">כמות</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">סוג</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row._key} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <input
                      value={row.category}
                      onChange={e => updateCategory(row._key, e.target.value)}
                      className="w-full bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-primary py-0.5"
                      dir="rtl"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={row.volunteer_name}
                        onChange={e => updateRow(row._key, 'volunteer_name', e.target.value)}
                        className="flex-1 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-primary py-0.5"
                        dir="rtl"
                      />
                      <button
                        onClick={() => promoteToCategory(row._key)}
                        className="text-gray-300 hover:text-blue-500 transition-colors p-1 flex-shrink-0"
                        title="הפוך לקטגוריה – שורות אחריו ישויכו לקטגוריה זו"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.count}
                      min={1}
                      onChange={e =>
                        updateRow(row._key, 'count', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-14 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-primary py-0.5 text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={row.source_type === 'emergency' ? 'destructive' : 'secondary'}
                      className="text-[10px] whitespace-nowrap"
                    >
                      {row.source_type === 'emergency' ? 'חירום' : 'שבועי'}
                    </Badge>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="מחק שורה"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
