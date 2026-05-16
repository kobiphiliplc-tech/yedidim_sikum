'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Event } from '@/lib/types'

interface Props {
  events: Event[]
  weekLabel: string
  orgName: string
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="white"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function LeaderboardPanel({ events, weekLabel, orgName }: Props) {
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const entries = useMemo(() => {
    const map = new Map<string, number>()
    for (const ev of events) {
      if (ev.source_type !== 'regular') continue
      map.set(ev.volunteer_name, (map.get(ev.volunteer_name) ?? 0) + ev.count)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [events])

  const topEntries = useMemo(() => {
    if (entries.length <= 10) return entries
    const cutoff = entries[9].value
    return entries.filter(e => e.value >= cutoff)
  }, [entries])

  const totalCalls = useMemo(
    () => entries.reduce((sum, e) => sum + e.value, 0),
    [entries]
  )

  async function handleGenerate() {
    if (entries.length === 0) return
    setLoading(true)
    setError(null)
    setImageUrl(null)

    try {
      const res = await fetch('/api/generate-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: topEntries, weekLabel, orgName, totalCalls }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { imageUrl: string }
      setImageUrl(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setLoading(false)
    }
  }

  const whatsappHref = imageUrl
    ? `https://wa.me/?text=${encodeURIComponent(`כוכבי השבוע 🌟\n${window.location.origin}${imageUrl}`)}`
    : '#'

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">כוכבי השבוע ⭐</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              אין נתוני קריאות רגילות לשבוע זה
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {topEntries.length} מובילים מתוך {entries.length} · {totalCalls} קריאות סה&quot;כ
              </p>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'מייצר תמונה...' : 'צור תמונת כוכבי השבוע'}
              </button>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                  <img
                    src={imageUrl}
                    alt="כוכבי השבוע"
                    className="w-full h-auto block"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {imageUrl && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="שתף בוואטסאפ"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 1000,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25D366',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)' }}
        >
          <WhatsAppIcon />
        </a>
      )}
    </>
  )
}
