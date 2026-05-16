'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PasteImporter } from '@/components/PasteImporter'
import { ParsedPreview } from '@/components/ParsedPreview'
import { WeeklyDataView } from '@/components/WeeklyDataView'
import { SummaryPanel } from '@/components/SummaryPanel'
import { WeekManager } from '@/components/WeekManager'
import { CategoryManager } from '@/components/CategoryManager'
import { SettingsPanel } from '@/components/SettingsPanel'
import { LeaderboardPanel } from '@/components/LeaderboardPanel'
import { Separator } from '@/components/ui/separator'
import {
  groupEvents,
  generateSummary,
  countUniqueVolunteers,
  countTotalEvents,
} from '@/lib/summaryGenerator'
import { toast } from 'sonner'
import type { Week, Category, Event, ParsedRow, AppSettings } from '@/lib/types'

const DEFAULT_SETTINGS: AppSettings = { header: '', footer: '', emergencyHeader: '' }

export default function DashboardPage() {
  const supabase = createClient()

  const [activeWeek, setActiveWeek] = useState<Week | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loadingBootstrap, setLoadingBootstrap] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [saving, setSaving] = useState(false)

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('type')
      .order('display_order', { ascending: true, nullsFirst: false })
    if (error) console.error('[categories]', error)
    setCategories((data as Category[]) ?? [])
  }, [supabase])

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['header_template', 'footer_template', 'emergency_header_template'])
    if (error) { console.error('[settings]', error); return }
    const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
    setSettings({
      header: map['header_template'] ?? '',
      footer: map['footer_template'] ?? '',
      emergencyHeader: map['emergency_header_template'] ?? '',
    })
  }, [supabase])

  const loadEvents = useCallback(
    async (weekId: string) => {
      setLoadingEvents(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('week_id', weekId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('[events]', error)
        toast.error('שגיאה בטעינת נתונים')
      }
      setEvents((data as Event[]) ?? [])
      setLoadingEvents(false)
    },
    [supabase]
  )

  const loadBootstrap = useCallback(async () => {
    setLoadingBootstrap(true)
    try {
      const [weekRes, catRes, settingsRes] = await Promise.all([
        supabase
          .from('weeks')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('categories').select('*').order('type').order('display_order', { ascending: true, nullsFirst: false }),
        supabase
          .from('settings')
          .select('key, value')
          .in('key', ['header_template', 'footer_template', 'emergency_header_template']),
      ])

      if (weekRes.error) console.error('[bootstrap weeks]', weekRes.error)
      if (catRes.error) console.error('[bootstrap categories]', catRes.error)
      if (settingsRes.error) console.error('[bootstrap settings]', settingsRes.error)

      setActiveWeek((weekRes.data as Week) ?? null)
      setCategories((catRes.data as Category[]) ?? [])

      const map = Object.fromEntries(
        ((settingsRes.data ?? []) as { key: string; value: string }[]).map(r => [r.key, r.value])
      )
      setSettings({
        header: map['header_template'] ?? '',
        footer: map['footer_template'] ?? '',
        emergencyHeader: map['emergency_header_template'] ?? '',
      })
    } catch (err) {
      console.error('[bootstrap failed]', err)
      toast.error('שגיאת חיבור — בדוק את הגדרות Supabase')
    } finally {
      setLoadingBootstrap(false)
    }
  }, [supabase])

  useEffect(() => { loadBootstrap() }, [loadBootstrap])

  useEffect(() => {
    if (activeWeek) {
      loadEvents(activeWeek.id)
    } else {
      setEvents([])
    }
  }, [activeWeek, loadEvents])

  async function handleSave() {
    if (!activeWeek) {
      toast.error('אין שבוע פעיל — פתח שבוע חדש תחילה')
      return
    }
    if (activeWeek.status !== 'active') {
      toast.error('השבוע סגור — אי אפשר להוסיף נתונים')
      return
    }
    if (parsedRows.length === 0) return

    setSaving(true)
    const payload = parsedRows
      .filter(r => r.category.trim() && r.volunteer_name.trim())
      .map(r => ({
        week_id: activeWeek.id,
        category: r.category.trim(),
        volunteer_name: r.volunteer_name.trim(),
        count: r.count,
        source_type: r.source_type,
        incident_id: r.incident_id,
      }))

    const { error } = await supabase.from('events').insert(payload)
    if (error) {
      toast.error('שגיאה בשמירה: ' + error.message)
    } else {
      toast.success(`${payload.length} רשומות נשמרו בהצלחה`)
      setParsedRows([])
      await loadEvents(activeWeek.id)
    }
    setSaving(false)
  }

  async function handleCloseWeek() {
    if (!activeWeek) return
    const { error } = await supabase
      .from('weeks')
      .update({ status: 'closed' })
      .eq('id', activeWeek.id)
    if (error) throw error
    setActiveWeek({ ...activeWeek, status: 'closed' })
  }

  async function handleOpenNewWeek() {
    if (activeWeek?.status === 'active') {
      await supabase.from('weeks').update({ status: 'closed' }).eq('id', activeWeek.id)
    }
    const { data, error } = await supabase
      .from('weeks')
      .insert({ status: 'active' })
      .select()
      .single()
    if (error) throw error
    setActiveWeek(data as Week)
    setEvents([])
    setParsedRows([])
  }

  async function handleCopySummary() {
    if (events.length === 0) {
      toast.error('אין נתונים להעתקה')
      return
    }
    const groups = groupEvents(events, categories)
    const text = generateSummary(
      groups,
      settings,
      countUniqueVolunteers(events),
      countTotalEvents(groups)
    )
    try {
      await navigator.clipboard.writeText(text)
      toast.success('הסיכום הועתק ללוח')
    } catch {
      toast.error('ההעתקה נכשלה')
    }
  }

  const isWeekClosed = !activeWeek || activeWeek.status === 'closed'

  if (loadingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        טוען...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">ידידים</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">סיכום שבועי</span>
          </div>
          {activeWeek && (
            <span
              className={[
                'text-[10px] font-medium px-2 py-0.5 rounded-full',
                activeWeek.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500',
              ].join(' ')}
            >
              {activeWeek.status === 'active' ? 'שבוע פתוח' : 'שבוע סגור'}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-28">
        {/* Week manager */}
        <WeekManager
          activeWeek={activeWeek}
          onCloseWeek={handleCloseWeek}
          onOpenNewWeek={handleOpenNewWeek}
          eventCount={events.length}
        />

        <Separator />

        {/* Paste importer */}
        <PasteImporter
          categories={categories}
          onParsed={setParsedRows}
          disabled={isWeekClosed}
        />

        {/* Parsed preview — shown only when rows exist */}
        {parsedRows.length > 0 && (
          <ParsedPreview
            rows={parsedRows}
            onRowsChange={setParsedRows}
            onSave={handleSave}
            onDiscard={() => setParsedRows([])}
            saving={saving}
          />
        )}

        <Separator />

        {/* Saved data */}
        <WeeklyDataView events={events} loading={loadingEvents} />

        {/* Summary */}
        <SummaryPanel events={events} settings={settings} categories={categories} />

        {/* Leaderboard image generator */}
        <LeaderboardPanel
          events={events}
          weekLabel={
            activeWeek
              ? new Date(activeWeek.created_at).toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'numeric',
                })
              : '—'
          }
          orgName="ידידים"
        />

        {/* Settings */}
        <Separator />
        <CategoryManager categories={categories} onCategoriesChanged={loadCategories} />
        <SettingsPanel settings={settings} onSettingsChanged={loadSettings} />
      </main>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur-sm z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={handleCopySummary}
            disabled={events.length === 0}
            className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            העתק סיכום
          </button>
          <button
            onClick={() => {
              if (activeWeek?.status === 'active') {
                handleCloseWeek()
                  .then(() => toast.success('השבוע נסגר'))
                  .catch(() => toast.error('שגיאה בסגירה'))
              } else {
                handleOpenNewWeek()
                  .then(() => toast.success('שבוע חדש נפתח'))
                  .catch(() => toast.error('שגיאה בפתיחה'))
              }
            }}
            className="flex-1 h-11 rounded-xl border border-border bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium transition-colors"
          >
            {activeWeek?.status === 'active' ? 'סגור שבוע' : 'פתח שבוע חדש'}
          </button>
        </div>
      </div>
    </div>
  )
}
