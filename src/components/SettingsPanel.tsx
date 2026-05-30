'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sliders } from 'lucide-react'
import { toast } from 'sonner'
import type { AppSettings } from '@/lib/types'

interface Props {
  settings: AppSettings
  onSettingsChanged: () => void
}

export function SettingsPanel({ settings, onSettingsChanged }: Props) {
  const supabase = createClient()
  const [header, setHeader] = useState(settings.header)
  const [footer, setFooter] = useState(settings.footer)
  const [emergencyHeader, setEmergencyHeader] = useState(settings.emergencyHeader)
  const [leaderboardSectionHeader, setLeaderboardSectionHeader] = useState(settings.leaderboardSectionHeader)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHeader(settings.header)
    setFooter(settings.footer)
    setEmergencyHeader(settings.emergencyHeader)
    setLeaderboardSectionHeader(settings.leaderboardSectionHeader)
  }, [settings.header, settings.footer, settings.emergencyHeader, settings.leaderboardSectionHeader])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('settings').upsert([
      { key: 'header_template', value: header },
      { key: 'footer_template', value: footer },
      { key: 'emergency_header_template', value: emergencyHeader },
      { key: 'leaderboard_section_header', value: leaderboardSectionHeader },
    ])
    if (error) {
      toast.error('שגיאה בשמירת הגדרות')
    } else {
      toast.success('הגדרות נשמרו')
      onSettingsChanged()
    }
    setSaving(false)
  }

  const hasChanges = header !== settings.header || footer !== settings.footer || emergencyHeader !== settings.emergencyHeader || leaderboardSectionHeader !== settings.leaderboardSectionHeader

  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer select-none py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors list-none">
        <Sliders className="w-4 h-4" />
        <span>תבנית הודעה</span>
        {hasChanges && (
          <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
            לא שמור
          </span>
        )}
        <span className="text-xs group-open:rotate-90 transition-transform inline-block leading-none mr-auto">
          ›
        </span>
      </summary>

      <div className="mt-3 rounded-xl border bg-card p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          משתנים זמינים:{' '}
          <code className="bg-muted px-1 rounded">{'{total_events}'}</code> — סה״כ קריאות,{' '}
          <code className="bg-muted px-1 rounded">{'{total_volunteers}'}</code> — מתנדבים ייחודיים,{' '}
          <code className="bg-muted px-1 rounded">{'{emergency_count}'}</code> — אירועי חירום
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">כותרת סעיף רשימת מובילים בדו&quot;ח שבועי</label>
          <input
            value={leaderboardSectionHeader}
            onChange={e => setLeaderboardSectionHeader(e.target.value)}
            placeholder="רשימת כל המתנדבים שיצאו לסייע:"
            dir="rtl"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">הכותרת שמופיעה בדו&quot;ח לפני רשימת הסיכום הכוללת</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">כותרת סעיף אירועי חירום</label>
          <textarea
            value={emergencyHeader}
            onChange={e => setEmergencyHeader(e.target.value)}
            placeholder={'למשל:\n🚨🚨🚨*אירועי חירום {emergency_count}*🚨🚨🚨'}
            rows={2}
            dir="rtl"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">פתיח הודעה</label>
          <textarea
            value={header}
            onChange={e => setHeader(e.target.value)}
            placeholder={'למשל:\nשבוע {total_events} קריאות'}
            rows={3}
            dir="rtl"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">סיום הודעה</label>
          <textarea
            value={footer}
            onChange={e => setFooter(e.target.value)}
            placeholder={'למשל:\nסה״כ {total_volunteers} מתנדבים שיצאו\nתודה לכולם!'}
            rows={3}
            dir="rtl"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full"
        >
          {saving ? 'שומר...' : 'שמור תבנית'}
        </Button>
      </div>
    </details>
  )
}
