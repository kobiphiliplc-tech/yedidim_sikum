'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { groupEvents, countTotalEvents } from '@/lib/summaryGenerator'
import type { Event, CategoryGroup } from '@/lib/types'

interface Props {
  events: Event[]
  loading: boolean
}

export function WeeklyDataView({ events, loading }: Props) {
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

  function renderSection(title: string, sectionGroups: CategoryGroup[], accentClass: string) {
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
                : group.incidents.map((inc, i) => (
                    <div key={inc.incident_id} className="text-sm py-0.5 text-muted-foreground">
                      <span className="font-mono text-xs ml-1">{i + 1}.</span>
                      {' '}{inc.volunteers.join(', ')}
                    </div>
                  ))}
            </div>
          </details>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          נתוני השבוע
          <span className="mr-2 text-xs font-normal text-muted-foreground">
            {totalActions} פעולות · {groups.length} קטגוריות
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection('אירועי חירום', emergencyGroups, 'text-red-600')}
        {emergencyGroups.length > 0 && (extraGroups.length > 0 || regularGroups.length > 0) && (
          <Separator />
        )}
        {renderSection('קטגוריות נוספות', extraGroups, 'text-orange-600')}
        {extraGroups.length > 0 && regularGroups.length > 0 && <Separator />}
        {renderSection('סטטיסטיקה שבועית', regularGroups, 'text-blue-600')}
      </CardContent>
    </Card>
  )
}
