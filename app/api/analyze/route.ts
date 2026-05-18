import { NextResponse } from 'next/server'
import Jimp from 'jimp'

const menuItems = [
  // MEJERI
  { name: 'Røræg', x: 70, y: 310 },
  { name: 'Spejlæg', x: 70, y: 380 },
  { name: 'Modnet Havarti ost', x: 70, y: 450 },
  { name: 'Hjemmelavet blåbæryoghurt', x: 70, y: 520 },
  { name: 'Hjemmelavet chiagrød', x: 70, y: 600 },

  // PLANTERIGET
  { name: 'Avocado og hytteost', x: 70, y: 810 },
  { name: 'Eksotisk frugtskål', x: 70, y: 880 },
  { name: 'Smashed peas med forårsmynte', x: 70, y: 950 },

  // BAGERIET
  { name: 'Pain au chocolat fra Meyers', x: 70, y: 1180 },
  { name: 'Øko. smørcrossaint fra Meyers', x: 70, y: 1260 },
  { name: 'Mariagertoba-toast', x: 70, y: 1330 },

  // KØD OG FISK
  { name: 'Rösti', x: 580, y: 310 },
  { name: 'Hjemmelavet hønsesalat', x: 580, y: 390 },
  { name: 'Crispy chicken', x: 580, y: 470 },
  { name: '2 brunchpølser', x: 580, y: 550 },
  { name: 'Koldrøget laks', x: 580, y: 640 },

  // FINALEN
  { name: 'Lun rabarber crumble', x: 580, y: 850 },
  { name: 'Øllebrød med let vaniljeskum', x: 580, y: 930 },
  { name: '2 amerikanske pandekager', x: 580, y: 1040 },
]

export async function POST(req: Request) {
  const formData = await req.formData()

  const files = formData.getAll('images') as File[]

  const totals: Record<string, number> = {}

  menuItems.forEach((item) => {
    totals[item.name] = 0
  })

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())

    const image = await Jimp.read(buffer)

    for (const item of menuItems) {
      const size = 32

      let darkPixels = 0

      for (let x = item.x; x < item.x + size; x++) {
        for (let y = item.y; y < item.y + size; y++) {
          const color = image.getPixelColor(x, y)

          const rgba = Jimp.intToRGBA(color)

          const brightness =
            (rgba.r + rgba.g + rgba.b) / 3

          if (brightness < 150) {
            darkPixels++
          }
        }
      }

      // threshold
      if (darkPixels > 120) {
        totals[item.name]++
      }
    }
  }

  return NextResponse.json({
    success: true,
    scannedImages: files.length,
    totals,
  })
}
