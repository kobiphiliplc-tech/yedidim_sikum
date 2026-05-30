'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseEmergencyAndExtra } from '@/lib/parsers/emergencyParser'
import { parseWeekly, parseVolunteerTotals } from '@/lib/parsers/weeklyParser'
import type { Category, ParsedRow } from '@/lib/types'
import type { VolunteerTotal } from '@/lib/parsers/weeklyParser'

type ParseType = 'emergency' | 'regular'

interface Props {
  categories: Category[]
  onParsed: (rows: ParsedRow[]) => void
  onVolunteerTotalsParsed?: (totals: VolunteerTotal[]) => void
  leaderboardSectionHeader?: string
  disabled?: boolean
}

export function PasteImporter({ categories, onParsed, onVolunteerTotalsParsed, leaderboardSectionHeader, disabled }: Props) {
  const [text, setText] = useState('')
  const [type, setType] = useState<ParseType>('emergency')

  function handleParse() {
    const trimmed = text.trim()
    if (!trimmed) return
    if (type === 'emergency') {
      onParsed(parseEmergencyAndExtra(trimmed, categories))
    } else {
      onParsed(parseWeekly(trimmed))
      if (onVolunteerTotalsParsed) {
        onVolunteerTotalsParsed(parseVolunteerTotals(trimmed, leaderboardSectionHeader))
      }
    }
    setText('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">הדבק טקסט לייבוא</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('emergency')}
            disabled={disabled}
            className={[
              'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
              type === 'emergency'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            אירועי חירום
          </button>
          <button
            type="button"
            onClick={() => setType('regular')}
            disabled={disabled}
            className={[
              'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
              type === 'regular'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            דו&quot;ח שבועי
          </button>
        </div>

        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={
            type === 'emergency'
              ? 'הדבק כאן דוח אירועי חירום...'
              : 'הדבק כאן דוח סטטיסטיקה שבועי...'
          }
          className="min-h-[160px] text-sm font-mono leading-relaxed"
          disabled={disabled}
          dir="rtl"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleParse}
            disabled={!text.trim() || disabled}
            className="flex-1"
          >
            פרסר וצור תצוגה מקדימה
          </Button>
          {text && (
            <Button variant="outline" onClick={() => setText('')} disabled={disabled}>
              נקה
            </Button>
          )}
        </div>

        {disabled && (
          <p className="text-xs text-muted-foreground text-center">
            השבוע סגור — אי אפשר לייבא נתונים חדשים
          </p>
        )}
      </CardContent>
    </Card>
  )
}
