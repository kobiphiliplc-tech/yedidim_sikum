'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  groupEvents,
  generateSummary,
  countUniqueVolunteers,
  countTotalEvents,
} from '@/lib/summaryGenerator'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { Event, AppSettings, Category } from '@/lib/types'

interface Props {
  events: Event[]
  settings: AppSettings
  categories: Category[]
}

export function SummaryPanel({ events, settings, categories }: Props) {
  const summary = useMemo(() => {
    if (events.length === 0) return ''
    const groups = groupEvents(events, categories)
    const uniqueVolunteers = countUniqueVolunteers(events)
    const totalEvents = countTotalEvents(groups)
    return generateSummary(groups, settings, uniqueVolunteers, totalEvents)
  }, [events, settings, categories])

  async function handleCopy() {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      toast.success('הסיכום הועתק ללוח')
    } catch {
      toast.error('ההעתקה נכשלה — נסה שוב')
    }
  }

  if (!summary) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">סיכום לוואטסאפ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            אין נתונים לסיכום
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">סיכום לוואטסאפ</CardTitle>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" />
            העתק
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          dir="rtl"
          className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/40 rounded-lg p-3 max-h-72 overflow-y-auto"
        >
          {summary.split('\n').map((line, i) => {
            if (/^\*.+\*$/.test(line)) {
              return (
                <strong key={i} className="block text-foreground font-semibold">
                  {line.replace(/\*/g, '')}
                </strong>
              )
            }
            if (line === '') {
              return <br key={i} />
            }
            return (
              <span key={i} className="block text-muted-foreground">
                {line}
              </span>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
