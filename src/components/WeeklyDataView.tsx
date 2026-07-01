'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { groupEvents, countTotalEvents } from '@/lib/summaryGenerator'
import { Trash2, Tag, Pencil } from 'lucide-react'
import type { Event, CategoryGroup } from '@/lib/types'

interface Props {
  events: Event[]
  loading: boolean
  onRenameVolunteer?: (incidentId: string, oldName: string, newName: string) => Promise<void>
  onDeleteVolunteer?: (incidentId: string, name: string) => Promise<void>
  onPromoteToCategory?: (incidentId: string, name: string) => Promise<void>
}

interface EditingVolunteer {
  incidentId: string
  oldName: string
}

export function WeeklyDataView({ events, loading, onRenameVolunteer, onDeleteVolunteer, onPromoteToCategory }: Props) {
  const [editing, setEditing] = useState<EditingVolunteer | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const canEdit = !!(onRenameVolunteer || onDeleteVolunteer || onPromoteToCategory)

  const lastEmergencyIncidentId = useMemo(() => {
    const emergencyEvents = events.filter(e => e.source_type === 'emergency')
    if (emergencyEvents.length === 0) return null
    return emergencyEvents[emergencyEvents.length - 1].incident_id
  }, [events])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">נתוני השבוע</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">נתוני השבוע</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            אין נתונים לשבוע זה עדיין
          </p>
        </CardContent>
      </Card>
    )
  }

  const groups = groupEvents(events)
  const emergencyGroups = groups.filter(g => g.source_type === 'emergency')
  const extraGroups = groups.filter(g => g.source_type === 'extra')
  const regularGroups = groups.filter(g => g.source_type === 'regular')
  const totalActions = countTotalEvents(groups)

  async function saveEdit() {
    if (!editing || !onRenameVolunteer) return
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === editing.oldName) {
      setEditing(null)
      return
    }
    if (!window.confirm(`לשנות את "${editing.oldName}" ל-"${trimmed}"?`)) return
    setEditSaving(true)
    try {
      await onRenameVolunteer(editing.incidentId, editing.oldName, trimmed)
    } finally {
      setEditSaving(false)
      setEditing(null)
    }
  }

  function startEdit(incidentId: string, name: string) {
    setEditing({ incidentId, oldName: name })
    setEditValue(name)
  }

  function renderVolunteerName(incidentId: string, name: string, isLast: boolean) {
    const isEditingThis = editing?.incidentId === incidentId && editing?.oldName === name

    if (isEditingThis) {
      return (
        <span key={`${incidentId}::${name}`} className="inline-flex items-center gap-1">
          <input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setEditing(null)
            }}
            disabled={editSaving}
            className="text-sm border rounded px-1.5 py-0 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
            dir="rtl"
          />
          <button
            onClick={saveEdit}
            disabled={editSaving}
            className="text-[11px] bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-0.5 rounded disabled:opacity-50"
          >
            שמור
          </button>
          <button
            onClick={() => setEditing(null)}
            disabled={editSaving}
            className="text-[11px] border px-1.5 py-0.5 rounded hover:bg-muted"
          >
            ביטול
          </button>
        </span>
      )
    }

    return (
      <span key={`${incidentId}::${name}`} className="inline-flex items-center gap-0.5">
        <span>{name}</span>
        {onRenameVolunteer && editMode && (
          <button
            onClick={() => startEdit(incidentId, name)}
            className="text-gray-300 hover:text-gray-500 transition-colors text-xs px-0.5 leading-none"
            title="ערוך שם"
          >
            ✎
          </button>
        )}
        {onPromoteToCategory && editMode && (
          <button
            onClick={() => {
              if (window.confirm(`להפוך את "${name}" לקטגוריה? השמות אחריו באותו אירוע ישויכו לקריאה חדשה.`))
                onPromoteToCategory(incidentId, name)
            }}
            className="text-gray-300 hover:text-blue-500 transition-colors p-0.5 leading-none"
            title="הפוך לקטגוריה"
          >
            <Tag className="w-3 h-3" />
          </button>
        )}
        {onDeleteVolunteer && editMode && (
          <button
            onClick={() => {
              if (window.confirm(`למחוק את "${name}"?`))
                onDeleteVolunteer(incidentId, name)
            }}
            className="text-gray-300 hover:text-red-500 transition-colors p-0.5 leading-none"
            title="מחק"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        {!isLast && <span className="mr-0.5">,</span>}
      </span>
    )
  }

  function renderSection(title: string, sectionGroups: CategoryGroup[], accentClass: string, editable = false, lastIncidentId: string | null = null) {
    if (sectionGroups.length === 0) return null
    return (
      <div className="space-y-1">
        <div className={`text-xs font-semibold uppercase tracking-wide pb-1 ${accentClass}`}>
          {title}
        </div>
        {sectionGroups.map(group => (
          <details
            key={`${group.source_type}::${group.category}`}
            className="group rounded-lg"
          >
            <summary className="flex items-center justify-between cursor-pointer py-2 px-3 rounded-lg hover:bg-muted/60 list-none select-none">
              <span className="font-medium text-sm">{group.category}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-mono">
                  {group.source_type === 'regular'
                    ? group.total_count
                    : `${group.total_incidents} קריאות`}
                </Badge>
                <span className="text-gray-400 text-xs group-open:rotate-90 transition-transform inline-block leading-none">
                  ›
                </span>
              </div>
            </summary>
            <div className="px-3 pb-2 pt-1 space-y-1">
              {group.source_type === 'regular'
                ? group.entries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm py-0.5 text-muted-foreground"
                    >
                      <span>{entry.volunteer_name}</span>
                      <span className="font-mono text-xs tabular-nums">{entry.count}</span>
                    </div>
                  ))
                : group.incidents.map((inc, i) => {
                    const isLast = lastIncidentId !== null && inc.incident_id === lastIncidentId
                    return (
                      <div key={inc.incident_id} className={`text-sm py-0.5 flex items-start gap-1 flex-wrap ${isLast ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        <span className="font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <span className="inline-flex flex-wrap gap-y-0.5">
                          {editable
                            ? inc.volunteers.map((name, vi) =>
                                renderVolunteerName(inc.incident_id, name, vi === inc.volunteers.length - 1)
                              )
                            : inc.volunteers.join(', ')}
                        </span>
                      </div>
                    )
                  })}
            </div>
          </details>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            נתוני השבוע
            <span className="mr-2 text-xs font-normal text-muted-foreground">
              {totalActions} פעולות · {groups.length} קטגוריות
            </span>
          </CardTitle>
          {canEdit && (
            <button
              onClick={() => { setEditMode(m => !m); setEditing(null) }}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${editMode ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
              title={editMode ? 'סגור עריכה' : 'ערוך'}
            >
              <Pencil className="w-3 h-3" />
              {editMode ? 'סגור עריכה' : 'עריכה'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection('אירועי חירום', emergencyGroups, 'text-red-600', canEdit && editMode, lastEmergencyIncidentId)}
        {emergencyGroups.length > 0 && (extraGroups.length > 0 || regularGroups.length > 0) && (
          <Separator />
        )}
        {renderSection('קטגוריות נוספות', extraGroups, 'text-orange-600', canEdit && editMode)}
        {extraGroups.length > 0 && regularGroups.length > 0 && <Separator />}
        {renderSection('סטטיסטיקה שבועית', regularGroups, 'text-blue-600')}
      </CardContent>
    </Card>
  )
}
