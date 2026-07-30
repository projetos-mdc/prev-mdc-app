import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const download = req.nextUrl.searchParams.get('download')
  const filename = req.nextUrl.searchParams.get('filename') || 'qr-code.png'

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  const qrApiUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=400x400&data=${encodeURIComponent(url)}&format=png&margin=16&color=008194`

  try {
    const res = await fetch(qrApiUrl)
    if (!res.ok) throw new Error('QR API error')

    const buffer = await res.arrayBuffer()

    const headers: Record<string, string> = {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    }

    if (download === '1') {
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new NextResponse(buffer, { headers })
  } catch {
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
