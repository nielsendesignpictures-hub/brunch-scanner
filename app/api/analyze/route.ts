import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const formData = await req.formData()

  const images = formData.getAll('images')

  return NextResponse.json({
    success: true,
    uploaded: images.length,

    totals: {
      roraeg: images.length * 1,
      polser: images.length * 1,
      laks: images.length * 0,
    },
  })
}
