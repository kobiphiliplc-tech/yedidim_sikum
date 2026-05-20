'use client'

import { useRef, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupEvents, countTotalEvents, countUniqueVolunteers } from '@/lib/summaryGenerator'
import type { Event } from '@/lib/types'

interface Props {
  events: Event[]
  weekLabel: string
  orgName: string
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

export function LeaderboardPanel({ events, weekLabel, orgName }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
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
    () => countTotalEvents(groupEvents(events)),
    [events]
  )

  const uniqueVolunteers = useMemo(() => countUniqueVolunteers(events), [events])

  const first  = topEntries[0] ?? { name: '—', value: 0 }
  const second = topEntries[1] ?? { name: '—', value: 0 }
  const third  = topEntries[2] ?? { name: '—', value: 0 }
  const maxValue = first.value || 1

  async function handleShare() {
    if (!cardRef.current || entries.length === 0) return
    setSharing(true)
    setError(null)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#f3f4f6',
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

          {/* Summary card — captured by html-to-image */}
          <div
            ref={cardRef}
            style={{
              padding: '12px 12px 20px',
              background: '#f3f4f6',
              borderRadius: '12px',
              direction: 'rtl',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                fontFamily: 'system-ui, Arial, sans-serif',
                border: '1px solid #e0e0e0',
              }}
            >
              {/* Header */}
              <div style={{ background: '#ffffff', borderBottom: '1px solid #f0f0f0' }}>
                {/* Top row: title+subtitle on right (first in RTL DOM), logo on left */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 10px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e' }}>
                      כוכבי השבוע ⭐
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginTop: '2px' }}>
                      סניף פתח-תקווה
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo_new.png"
                    alt="ידידים"
                    style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>
                {/* Bottom strip: total count badge + volunteers */}
                <div style={{ borderTop: '0.5px solid #e8e8e8', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#f3f4f6',
                      color: '#555',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {`סה"כ ${totalCalls} קריאות`}
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#f3f4f6',
                      color: '#555',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {`ע"י ${uniqueVolunteers} מתנדבים`}
                  </div>
                </div>
              </div>

              {/* Podium */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '14px 12px',
                  background: '#f8f9fa',
                }}
              >
                {/* 3rd */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '10px', padding: '10px 6px', textAlign: 'center', border: '1.5px solid #E8E8E8' }}>
                  <div style={{ fontSize: '24px', lineHeight: 1 }}>🥉</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2C3E50', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{third.name}</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#2C3E50' }}>{third.value}</div>
                  <div style={{ fontSize: '10px', color: '#95A5A6' }}>קריאות</div>
                </div>
                {/* 1st */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '10px', padding: '10px 6px', textAlign: 'center', border: '2.5px solid #F39C12' }}>
                  <div style={{ fontSize: '28px', lineHeight: 1 }}>🥇</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2C3E50', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{first.name}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2C3E50' }}>{first.value}</div>
                  <div style={{ fontSize: '10px', color: '#95A5A6' }}>קריאות</div>
                </div>
                {/* 2nd */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '10px', padding: '10px 6px', textAlign: 'center', border: '1.5px solid #E8E8E8' }}>
                  <div style={{ fontSize: '24px', lineHeight: 1 }}>🥈</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2C3E50', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{second.name}</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#2C3E50' }}>{second.value}</div>
                  <div style={{ fontSize: '10px', color: '#95A5A6' }}>קריאות</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#EBEBEB', margin: '0 12px' }} />

              {/* Bar chart */}
              <div style={{ padding: '10px 12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#95A5A6', marginBottom: '8px' }}>
                  {topEntries.length === 1 ? 'המוביל' : `${topEntries.length} מובילים`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {topEntries.map((entry, i) => {
                    const widthPct = Math.round((entry.value / maxValue) * 100)
                    const color = BAR_COLORS[i % BAR_COLORS.length]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '14px', fontSize: '11px', fontWeight: 700, color: '#95A5A6', flexShrink: 0, textAlign: 'left' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C3E50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.name}
                          </span>
                          <div style={{ height: '6px', background: '#F0F0F0', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: '99px' }} />
                          </div>
                        </div>
                        <div style={{ width: '22px', fontSize: '11px', color: '#95A5A6', flexShrink: 0, textAlign: 'left' }}>
                          {entry.value}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

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
