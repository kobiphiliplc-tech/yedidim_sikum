'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Event } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  events: Event[]
}

export function VolunteerListPanel({ events }: Props) {
  const volunteers = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) set.add(ev.volunteer_name.trim())
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'))
  }, [events])

  if (volunteers.length === 0) return null

  async function handleCopy() {
    const text = volunteers.map((name, i) => `${i + 1}. ${name}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('הרשימה הועתקה ללוח')
    } catch {
      toast.error('ההעתקה נכשלה')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">רשימת מתנדבים — בקרה</CardTitle>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded-lg border border-border bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium"
          >
            העתק רשימה
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{volunteers.length} מתנדבים ייחודיים · ממוין א-ב</p>
      </CardHeader>
      <CardContent>
        <ol className="text-sm space-y-0.5 select-all" dir="rtl">
          {volunteers.map((name, i) => (
            <li key={name} className="flex gap-2 py-0.5 border-b border-gray-50 last:border-0">
              <span className="text-muted-foreground w-6 text-left flex-shrink-0">{i + 1}.</span>
              <span>{name}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
