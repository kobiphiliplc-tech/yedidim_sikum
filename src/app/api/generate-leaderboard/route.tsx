import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

interface LeaderboardEntry {
  name: string
  value: number
}

interface RequestBody {
  entries?: LeaderboardEntry[]
  weekLabel: string
  orgName: string
  totalCalls: number
}

const BAR_COLORS = [
  '#4F9CF9', '#7C6FCD', '#4CAF50', '#26C6DA', '#FFA726',
  '#EF5350', '#66BB6A', '#EC407A', '#AB47BC', '#42A5F5',
]

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { weekLabel, totalCalls } = body

    if (!body.entries || body.entries.length === 0) {
      return NextResponse.json({ error: 'entries required' }, { status: 400 })
    }

    const entries = [...body.entries].sort((a, b) => b.value - a.value)
    const first  = entries[0] ?? { name: '—', value: 0 }
    const second = entries[1] ?? { name: '—', value: 0 }
    const third  = entries[2] ?? { name: '—', value: 0 }
    const maxValue = first.value || 1

    // Fetch Rubik font (includes Hebrew glyphs)
    const fontData = await fetch(
      'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.woff'
    ).then(r => r.arrayBuffer())

    const width = 800
    const height = Math.max(600, 400 + entries.length * 36)

    const podiumCard = (entry: LeaderboardEntry, medal: string, highlighted: boolean) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          background: 'white',
          borderRadius: '16px',
          padding: '20px 16px',
          border: highlighted ? '3px solid #F39C12' : '2px solid #E8E8E8',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '36px', lineHeight: 1 }}>{medal}</div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#2C3E50' }}>{entry.name}</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#2C3E50' }}>{entry.value}</div>
        <div style={{ fontSize: '12px', color: '#95A5A6' }}>קריאות</div>
      </div>
    )

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: `${width}px`,
            minHeight: `${height}px`,
            padding: '32px',
            background: '#FFFFFF',
            fontFamily: 'Rubik',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div style={{ background: '#F0F0F0', color: '#555', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
              {`סה"כ ${totalCalls} קריאות`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2C3E50' }}>{'כוכבי השבוע ⭐'}</div>
              <div style={{ fontSize: '14px', color: '#7F8C8D', marginTop: '4px' }}>{'דירוג שבועי'}</div>
            </div>
          </div>

          {/* Podium: left=3rd, center=1st, right=2nd */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {podiumCard(third, '🥉', false)}
            {podiumCard(first, '🥇', true)}
            {podiumCard(second, '🥈', false)}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#EBEBEB', marginBottom: '20px' }} />

          {/* Label */}
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#7F8C8D', marginBottom: '14px' }}>
            {'10 המובילים'}
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((entry, i) => {
              const widthPct = maxValue > 0 ? Math.round((entry.value / maxValue) * 100) : 0
              const color = BAR_COLORS[i % BAR_COLORS.length]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ width: '22px', fontSize: '12px', fontWeight: 700, color: '#7F8C8D', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ width: '115px', fontSize: '13px', fontWeight: 600, color: '#2C3E50', flexShrink: 0, overflow: 'hidden' }}>{entry.name}</div>
                  <div style={{ flex: 1, background: '#F0F0F0', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '32px', fontSize: '13px', fontWeight: 700, color: '#2C3E50', flexShrink: 0 }}>{entry.value}</div>
                </div>
              )
            })}
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: [{ name: 'Rubik', data: fontData, weight: 400 }],
      }
    )

    const arrayBuffer = await imageResponse.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return NextResponse.json({ imageUrl: `data:image/png;base64,${base64}` })
  } catch (err) {
    console.error('[generate-leaderboard]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
