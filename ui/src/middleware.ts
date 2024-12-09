import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const apiPort = process.env.API_PORT || 3001

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    const destination = new URL(`http://localhost:${apiPort}`)
    url.host = destination.host
    url.port = destination.port
    url.protocol = destination.protocol
    url.basePath = ''
    return NextResponse.rewrite(url)
  }
}
