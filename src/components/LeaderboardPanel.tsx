'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupEvents, countTotalEvents, countUniqueVolunteers } from '@/lib/summaryGenerator'
import type { Event } from '@/lib/types'

interface Props {
  events: Event[]
  weekLabel: string
  orgName: string
  leaderboardOverride?: { name: string; count: number }[] | null
}

const BAR_COLORS = [
  '#4F9CF9', '#7C6FCD', '#4CAF50', '#26C6DA', '#FFA726',
  '#EF5350', '#66BB6A', '#EC407A', '#AB47BC', '#42A5F5',
]

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="white" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function LeaderboardPanel({ events, weekLabel, orgName, leaderboardOverride }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entries = useMemo(() => {
    if (leaderboardOverride && leaderboardOverride.length > 0) {
      return leaderboardOverride
        .slice()
        .sort((a, b) => b.count - a.count)
        .map(e => ({ name: e.name, value: e.count }))
    }
    const map = new Map<string, number>()
    for (const ev of events) {
      if (ev.source_type !== 'regular') continue
      map.set(ev.volunteer_name, (map.get(ev.volunteer_name) ?? 0) + ev.count)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [events, leaderboardOverride])

  const topEntries = useMemo(() => {
    if (entries.length <= 10) return entries
    const cutoff = entries[9].value
    return entries.filter(e => e.value >= cutoff)
  }, [entries])

  const totalCalls = useMemo(
    () => countTotalEvents(groupEvents(events)),
    [events]
  )

  const uniqueVolunteers = useMemo(() => countUniqueVolunteers(events), [events])

  const first  = topEntries[0] ?? { name: '—', value: 0 }
  const second = topEntries[1] ?? { name: '—', value: 0 }
  const third  = topEntries[2] ?? { name: '—', value: 0 }
  const maxValue = first.value || 1
  // Bar chart: rank #4 is the 100% baseline, others are relative to it
  const barMaxValue = topEntries[3]?.value || 1
  // Compress rows when there are many entries so the card stays a fixed height
  const barList = topEntries.slice(3)
  const barGap = barList.length <= 5 ? 10 : barList.length <= 7 ? 8 : 5
  // Compact mode: smaller row elements when there are many entries
  const isCompact = barList.length > 8
  const circleSize = isCompact ? 18 : 22
  const barHeight = isCompact ? 5 : 8
  const rowFontSize = isCompact ? 11 : 12

  // Display scale: shrink the card to a preview size while html-to-image still captures it
  // at full resolution. The sizer div is set to the scaled dimensions so the preview reserves
  // the right space (no empty gap) and can scroll horizontally on narrow screens (phones).
  const CARD_SCALE = 0.78
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (cardRef.current) {
      setCardSize({ w: cardRef.current.offsetWidth, h: cardRef.current.offsetHeight })
    }
  }, [topEntries])

  async function handleShare() {
    if (!cardRef.current || entries.length === 0) return
    setSharing(true)
    setError(null)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#1B2A4A',
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'kochvei-hashavua.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `כוכבי השבוע — ${weekLabel}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'kochvei-hashavua.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('שגיאה בשיתוף: ' + (err as Error).message)
      }
    } finally {
      setSharing(false)
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">כוכבי השבוע ⭐</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            אין נתוני קריאות רגילות לשבוע זה
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">כוכבי השבוע ⭐</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {topEntries.length} מובילים מתוך {entries.length} · {totalCalls} קריאות סה&quot;כ
          </p>

          {/* Preview wrapper — horizontally scrollable on narrow screens; cardRef still captures full-res.
              outer = scroll area · sizer = scaled dimensions (clips layout overflow) · scaler = visual shrink */}
          <div style={{ width: '100%', overflowX: 'auto', direction: 'rtl' }}>
            <div style={{
              width: cardSize.w ? `${cardSize.w * CARD_SCALE}px` : undefined,
              height: cardSize.h ? `${cardSize.h * CARD_SCALE}px` : undefined,
              overflow: 'hidden',
            }}>
              <div style={{ transform: `scale(${CARD_SCALE})`, transformOrigin: 'top right', display: 'inline-block' }}>

          {/* Summary card — captured by html-to-image */}
          <div
            ref={cardRef}
            style={{
              padding: '16px',
              background: '#1B2A4A',
              borderRadius: '16px',
              direction: 'rtl',
              display: 'inline-block',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div
              style={{
                width: '680px',
                background: '#1B2A4A',
                borderRadius: '14px',
                overflow: 'hidden',
                fontFamily: 'system-ui, sans-serif',
                border: '1.5px solid #2D4170',
              }}
            >
              {/* Header — white strip */}
              <div style={{
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
              }}>
                {/* Title + subtitle — FIRST in JSX → RIGHT visually in RTL */}
                <div>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>
                    כוכבי השבוע ⭐
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280', marginTop: '4px' }}>
                    {orgName}
                  </div>
                </div>
                {/* Logo — SECOND in JSX → LEFT visually in RTL */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo_new.png"
                  alt="ידידים"
                  style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
                />
              </div>

              {/* Body — two columns; padding bottom matches the sides so no extra gap below */}
              <div style={{ display: 'flex', padding: '18px 16px 16px', background: '#1B2A4A' }}>

                {/* BAR LIST — FIRST in JSX → RIGHT side in RTL */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px', textAlign: 'right' }}>
                    {topEntries.length} מובילים
                  </div>
                  {/* barGap + isCompact compress rows when there are many entries */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: `${barGap}px` }}>
                    {barList.map((entry, i) => {
                      const widthPct = Math.round((entry.value / barMaxValue) * 100)
                      const color = BAR_COLORS[(i + 3) % BAR_COLORS.length]
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* Rank circle — white bg, FIRST in RTL row → rightmost */}
                          <div style={{
                            width: `${circleSize}px`, height: `${circleSize}px`, borderRadius: '50%',
                            background: '#FFFFFF', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: isCompact ? '10px' : '11px', fontWeight: 700, color: '#1B2A4A',
                          }}>
                            {i + 4}
                          </div>
                          {/* Name — fixed width so all bars start at the same position */}
                          <span style={{
                            fontSize: `${rowFontSize}px`, fontWeight: 400, color: '#FFFFFF',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            flexShrink: 0, width: '125px',
                          }}>
                            {entry.name}
                          </span>
                          {/* Bar track — fills remaining space, RTL flex → bar fills from right */}
                          <div style={{ flex: 1, height: `${barHeight}px`, background: '#2D4170', borderRadius: '99px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: '99px' }} />
                          </div>
                          {/* Call count — LAST in RTL row → leftmost */}
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', flexShrink: 0, width: '26px', textAlign: 'left' }}>
                            {entry.value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: '1px', background: '#2D4170', margin: '0 14px', flexShrink: 0 }} />

                {/* PODIUM + STATS — SECOND in JSX → LEFT side in RTL; alignSelf keeps it fixed */}
                <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', alignSelf: 'flex-start' }}>

                  {/* Podium: JSX 3rd | 1st | 2nd → RTL: 3rd RIGHT, 1st CENTER, 2nd LEFT */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    {/* 3rd */}
                    <div style={{
                      flex: 1, background: '#243860', borderRadius: '12px',
                      padding: '14px 8px', textAlign: 'center', border: '1.5px solid #2D4170',
                    }}>
                      <div style={{ fontSize: '26px', lineHeight: 1 }}>🥉</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{third.name}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{third.value}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>קריאות</div>
                    </div>
                    {/* 1st — gold border, taller */}
                    <div style={{
                      flex: 1, background: '#243860', borderRadius: '12px',
                      padding: '18px 8px', textAlign: 'center', border: '2.5px solid #F39C12',
                    }}>
                      <div style={{ fontSize: '32px', lineHeight: 1 }}>🥇</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{first.name}</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{first.value}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>קריאות</div>
                    </div>
                    {/* 2nd */}
                    <div style={{
                      flex: 1, background: '#243860', borderRadius: '12px',
                      padding: '14px 8px', textAlign: 'center', border: '1.5px solid #2D4170',
                    }}>
                      <div style={{ fontSize: '26px', lineHeight: 1 }}>🥈</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{second.name}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{second.value}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>קריאות</div>
                    </div>
                  </div>

                  {/* Stats — side by side; calls FIRST → right in RTL, volunteers SECOND → left.
                      RTL natural: text block first (→ right, text-align right), icon last (→ left).
                      fontWeight 700 is the native Hebrew bold so the word matches the number. */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Calls — FIRST → right in RTL. minWidth:0 keeps both pills equal width */}
                    <div style={{
                      flex: 1, minWidth: 0, background: '#243860', borderRadius: '10px', padding: '9px 8px',
                      border: '1px solid #2D4170', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                          {totalCalls} קריאות
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>סה&quot;כ השבוע</div>
                      </div>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>📞</span>
                    </div>
                    {/* Volunteers — SECOND → left in RTL */}
                    <div style={{
                      flex: 1, minWidth: 0, background: '#243860', borderRadius: '10px', padding: '9px 8px',
                      border: '1px solid #2D4170', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                          {uniqueVolunteers} מתנדבים
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>פעילים השבוע</div>
                      </div>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>👥</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

              </div>{/* end scaler */}
            </div>{/* end sizer */}
          </div>{/* end scroll wrapper */}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </CardContent>
      </Card>

      {/* WhatsApp FAB — always visible when there is data */}
      <button
        onClick={handleShare}
        disabled={sharing}
        aria-label="שתף בוואטסאפ"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 1000,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: sharing ? '#1da851' : '#25D366',
          border: 'none',
          cursor: sharing ? 'default' : 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s, background 0.2s',
          opacity: sharing ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (!sharing) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        <WhatsAppIcon />
      </button>
    </>
  )
}
