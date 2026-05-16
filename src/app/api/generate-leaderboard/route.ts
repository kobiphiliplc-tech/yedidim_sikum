import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

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

const CHROME_EXECUTABLE =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const BAR_COLORS = [
  '#4F9CF9',
  '#7C6FCD',
  '#4CAF50',
  '#26C6DA',
  '#FFA726',
  '#EF5350',
  '#66BB6A',
  '#EC407A',
  '#AB47BC',
  '#42A5F5',
]

function podiumCard(entry: LeaderboardEntry, medal: string, highlighted: boolean): string {
  const border = highlighted
    ? 'border: 3px solid #F39C12; box-shadow: 0 4px 20px rgba(243,156,18,0.3);'
    : 'border: 2px solid #E8E8E8;'
  return `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 20px 16px;
      text-align: center;
      flex: 1;
      ${border}
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    ">
      <span style="font-size: 36px; line-height: 1;">${medal}</span>
      <div style="font-weight: 700; font-size: 15px; color: #2C3E50; direction: rtl;">${entry.name}</div>
      <div style="font-size: 22px; font-weight: 800; color: #2C3E50;">${entry.value}</div>
      <div style="font-size: 12px; color: #95A5A6;">קריאות</div>
    </div>`
}

function barRow(entry: LeaderboardEntry, rank: number, maxValue: number): string {
  const widthPct = maxValue > 0 ? Math.round((entry.value / maxValue) * 100) : 0
  const color = BAR_COLORS[(rank - 1) % BAR_COLORS.length]
  return `
    <div style="display: flex; align-items: center; gap: 12px; direction: rtl; margin-bottom: 18px;">
      <div style="width: 22px; text-align: center; font-size: 12px; font-weight: 700; color: #7F8C8D; flex-shrink: 0;">${rank}</div>
      <div style="width: 115px; font-size: 13px; font-weight: 600; color: #2C3E50; text-align: right; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.name}</div>
      <div style="flex: 1; background: #F0F0F0; border-radius: 4px; height: 16px; overflow: hidden;">
        <div style="width: ${widthPct}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
      </div>
      <div style="width: 32px; text-align: left; font-size: 13px; font-weight: 700; color: #2C3E50; flex-shrink: 0;">${entry.value}</div>
    </div>`
}

function buildHtml(params: {
  entries: LeaderboardEntry[]
  weekLabel: string
  orgName: string
  totalCalls: number
}): string {
  const { entries, weekLabel, orgName, totalCalls } = params
  const first = entries[0] ?? { name: '—', value: 0 }
  const second = entries[1] ?? { name: '—', value: 0 }
  const third = entries[2] ?? { name: '—', value: 0 }
  const maxValue = first.value || 1

  const barRows = entries.map((e, i) => barRow(e, i + 1, maxValue)).join('')

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=800" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Rubik', 'Arial Hebrew', Arial, sans-serif;
      background: #FFFFFF;
      width: 800px;
      padding: 32px;
      direction: rtl;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; direction: ltr;">
    <div style="background: #F0F0F0; color: #555; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap;">סה"כ ${totalCalls} קריאות</div>
    <div style="text-align: right;">
      <div style="font-size: 30px; font-weight: 800; color: #2C3E50; line-height: 1.1;">כוכבי השבוע ⭐</div>
      <div style="font-size: 14px; color: #7F8C8D; margin-top: 4px;">דירוג שבועי</div>
    </div>
  </div>

  <!-- Podium: left=3rd, center=1st, right=2nd -->
  <div style="display: flex; gap: 12px; margin-bottom: 32px; direction: ltr;">
    ${podiumCard(third, '🥉', false)}
    ${podiumCard(first, '🥇', true)}
    ${podiumCard(second, '🥈', false)}
  </div>

  <!-- Divider -->
  <div style="height: 1px; background: #EBEBEB; margin-bottom: 20px;"></div>

  <!-- Label -->
  <div style="font-size: 13px; font-weight: 600; color: #7F8C8D; margin-bottom: 14px; text-align: right;">10 המובילים</div>

  <!-- Bar chart -->
  <div style="direction: rtl;">${barRows}</div>

</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { weekLabel, orgName, totalCalls } = body

    if (!body.entries || body.entries.length === 0) {
      return NextResponse.json({ error: 'entries required' }, { status: 400 })
    }

    let entries: LeaderboardEntry[] = body.entries

    entries = [...entries].sort((a, b) => b.value - a.value)

    const html = buildHtml({ entries, weekLabel, orgName, totalCalls })

    const outputDir = path.join(process.cwd(), 'public', 'output')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const filename = `leaderboard-${Date.now()}.png`
    const filePath = path.join(outputDir, filename)

    const browser = await puppeteer.launch({
      executablePath: CHROME_EXECUTABLE,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 800, height: 100, deviceScaleFactor: 2 })
      await page.setContent(html, { waitUntil: 'load' })
      // Wait for Google Fonts (Rubik) to finish loading before screenshot
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: filePath, fullPage: true, type: 'png' })
    } finally {
      await browser.close()
    }

    return NextResponse.json({ imageUrl: `/output/${filename}` })
  } catch (err) {
    console.error('[generate-leaderboard]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
