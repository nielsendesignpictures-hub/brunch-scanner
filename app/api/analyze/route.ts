import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return NextResponse.json({
    success: true,
    items: {
      roraeg: 1,
      polser: 1,
      laks: 0,
    },
  })
}
