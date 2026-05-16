'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarCheck, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { Week } from '@/lib/types'

interface Props {
  activeWeek: Week | null
  onCloseWeek: () => Promise<void>
  onOpenNewWeek: () => Promise<void>
  eventCount: number
}

export function WeekManager({ activeWeek, onCloseWeek, onOpenNewWeek, eventCount }: Props) {
  const [confirming, setConfirming] = useState<'close' | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  const weekStart = activeWeek
    ? new Date(activeWeek.created_at).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  async function handleClose() {
    if (confirming !== 'close') {
      setConfirming('close')
      return
    }
    setBusy(true)
    try {
      await onCloseWeek()
      toast.success('השבוע נסגר בהצלחה')
    } catch {
      toast.error('שגיאה בסגירת השבוע')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  async function handleNew() {
    if (confirming !== 'new') {
      setConfirming('new')
      return
    }
    setBusy(true)
    try {
      await onOpenNewWeek()
      toast.success('שבוע חדש נפתח')
    } catch {
      toast.error('שגיאה בפתיחת שבוע')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            {activeWeek ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">שבוע נוכחי</span>
                  <Badge
                    variant={activeWeek.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {activeWeek.status === 'active' ? 'פתוח' : 'סגור'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{weekStart}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {eventCount} רשומות בשבוע זה
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">אין שבוע פעיל</p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {confirming && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(null)}
                disabled={busy}
              >
                ביטול
              </Button>
            )}

            {activeWeek?.status === 'active' && (
              <Button
                size="sm"
                variant={confirming === 'close' ? 'destructive' : 'outline'}
                onClick={handleClose}
                disabled={busy}
                className="gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                {confirming === 'close' ? 'אשר סגירה' : 'סגור שבוע'}
              </Button>
            )}

            <Button
              size="sm"
              variant={confirming === 'new' ? 'default' : 'outline'}
              onClick={handleNew}
              disabled={busy}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {confirming === 'new' ? 'אשר פתיחה' : 'שבוע חדש'}
            </Button>
          </div>
        </div>

        {confirming === 'close' && (
          <p className="text-xs text-destructive mt-2 pt-2 border-t">
            סגירת השבוע תמנע הוספת נתונים חדשים. לחץ &quot;אשר סגירה&quot; לאישור.
          </p>
        )}
        {confirming === 'new' && (
          <p className="text-xs text-blue-600 mt-2 pt-2 border-t">
            פתיחת שבוע חדש תסמן את הנוכחי כסגור ותיצור שבוע חדש ריק. לחץ &quot;אשר פתיחה&quot; לאישור.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
