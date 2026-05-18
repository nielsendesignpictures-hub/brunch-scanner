import { NextResponse } from 'next/server'
import Jimp from 'jimp'

const menuItems = [
  // MEJERI
  { name: 'Røræg', x: 0.07, y: 0.24 },
  { name: 'Spejlæg', x: 0.07, y: 0.29 },
  { name: 'Modnet Havarti ost', x: 0.07, y: 0.35 },
  { name: 'Hjemmelavet blåbæryoghurt', x: 0.07, y: 0.41 },
  { name: 'Hjemmelavet chiagrød', x: 0.07, y: 0.49 },

  // PLANTERIGET
  { name: 'Avocado og hytteost', x: 0.07, y: 0.66 },
  { name: 'Eksotisk frugtskål', x: 0.07, y: 0.72 },
  { name: 'Smashed peas med forårsmynte', x: 0.07, y: 0.77 },

  // BAGERIET
  { name: 'Pain au chocolat fra Meyers', x: 0.07, y: 0.92 },
  { name: 'Øko. smørcrossaint fra Meyers', x: 0.07, y: 0.98 },

  // KØD OG FISK
  { name: 'Rösti', x: 0.55, y: 0.24 },
  { name: 'Hjemmelavet hønsesalat', x: 0.55, y: 0.30 },
  { name: 'Crispy chicken', x: 0.55, y: 0.38 },
  { name: '2 brunchpølser', x: 0.55, y: 0.46 },
  { name: 'Koldrøget laks', x: 0.55, y: 0.54 },

  // FINALEN
  { name: 'Lun rabarber crumble', x: 0.55, y: 0.66 },
  { name: 'Øllebrød med let vaniljeskum', x: 0.55, y: 0.74 },
  { name: '2 amerikanske pandekager', x: 0.55, y: 0.83 },
]

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const files = formData.getAll('images') as File[]

    const totals: Record<string, number> = {}

    menuItems.forEach((item) => {
      totals[item.name] = 0
    })

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())

    const image = await Jimp.read(buffer)

      // NORMALIZE SIZE
image.resize(1000, 1400)

      const width = image.bitmap.width
      const height = image.bitmap.height

      for (const item of menuItems) {
        const x = Math.floor(item.x * width)
        const y = Math.floor(item.y * height)

        const size = 22

        let darkPixels = 0

        for (let px = x; px < x + size; px++) {
          for (let py = y; py < y + size; py++) {
            const color = image.getPixelColor(px, py)

            const rgba = Jimp.intToRGBA(color)

            const brightness =
              (rgba.r + rgba.g + rgba.b) / 3

            if (brightness < 120) {
              darkPixels++
            }
          }
        }

        // CHECKBOX THRESHOLD
        if (darkPixels > 35) {
          totals[item.name]++
        }
      }
    }

    return NextResponse.json({
      success: true,
      scannedImages: files.length,
      totals,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    })
  }
}
