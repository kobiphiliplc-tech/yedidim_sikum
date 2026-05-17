'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarCheck, RotateCcw, History, ChevronDown, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { WeeklyDataView } from '@/components/WeeklyDataView'
import type { Week, Event } from '@/lib/types'

interface Props {
  activeWeek: Week | null
  onCloseWeek: () => Promise<void>
  onOpenNewWeek: () => Promise<void>
  onDeleteWeek: (id: string) => Promise<void>
  onViewWeek: (id: string) => Promise<void>
  eventCount: number
  allWeeks: Week[]
  weekEventCounts: Record<string, number>
  viewingWeekId: string | null
  viewingEvents: Event[]
  loadingViewingEvents: boolean
}

export function WeekManager({
  activeWeek,
  onCloseWeek,
  onOpenNewWeek,
  onDeleteWeek,
  onViewWeek,
  eventCount,
  allWeeks,
  weekEventCounts,
  viewingWeekId,
  viewingEvents,
  loadingViewingEvents,
}: Props) {
  const [confirming, setConfirming] = useState<'close' | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const weekStart = activeWeek
    ? new Date(activeWeek.created_at).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  async function handleClose() {
    if (confirming !== 'close') { setConfirming('close'); return }
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
    if (confirming !== 'new') { setConfirming('new'); return }
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

  async function handleDelete(weekId: string) {
    if (confirmDelete !== weekId) {
      setConfirmDelete(weekId)
      return
    }
    setDeleting(true)
    try {
      await onDeleteWeek(weekId)
      toast.success('השבוע נמחק')
      setConfirmDelete(null)
    } catch {
      toast.error('שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  const pastWeeks = allWeeks.filter(w => w.id !== activeWeek?.id && w.status === 'closed')
  const canUndoOpen = activeWeek?.status === 'active' && eventCount === 0 && pastWeeks.length > 0

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Current week info */}
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
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
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

        {/* Undo accidental week open */}
        {canUndoOpen && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground flex-1">שבוע זה ריק — פתחת בטעות?</p>
            {confirmDelete === activeWeek!.id ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleDelete(activeWeek!.id)}
                  disabled={deleting}
                >
                  אשר ביטול
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirmDelete(null)}
                >
                  השאר
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setConfirmDelete(activeWeek!.id)}
              >
                בטל פתיחה
              </Button>
            )}
          </div>
        )}

        {/* History toggle */}
        {pastWeeks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => { setShowHistory(h => !h); setConfirmDelete(null) }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>שבועות קודמים ({pastWeeks.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>

            {showHistory && (
              <div className="mt-3 space-y-1">
                {pastWeeks.map(week => (
                  <div key={week.id}>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{formatDate(week.created_at)}</span>
                        <span className="text-xs text-muted-foreground mr-2">
                          · {weekEventCounts[week.id] ?? 0} רשומות
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={viewingWeekId === week.id ? 'secondary' : 'ghost'}
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => onViewWeek(week.id)}
                        >
                          <Eye className="w-3 h-3" />
                          צפה
                        </Button>
                        {confirmDelete === week.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleDelete(week.id)}
                              disabled={deleting}
                            >
                              אשר
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmDelete(null)}
                            >
                              ביטול
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(week.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {viewingWeekId === week.id && (
                      <div className="mt-1 mb-2">
                        <WeeklyDataView events={viewingEvents} loading={loadingViewingEvents} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
