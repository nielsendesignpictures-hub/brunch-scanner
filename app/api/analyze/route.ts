import { NextResponse } from 'next/server'
import Jimp from 'jimp'

const menuItems = [
 // MEJERI
{ name: 'Røræg', x: 0.06, y: 0.19 },
{ name: 'Spejlæg', x: 0.06, y: 0.25 },
{ name: 'Modnet Havarti ost', x: 0.06, y: 0.31 },
{ name: 'Hjemmelavet blåbæryoghurt', x: 0.06, y: 0.37 },
{ name: 'Hjemmelavet chiagrød', x: 0.06, y: 0.46 },

// PLANTERIGET
{ name: 'Avocado og hytteost', x: 0.06, y: 0.61 },
{ name: 'Eksotisk frugtskål', x: 0.06, y: 0.67 },
{ name: 'Smashed peas med forårsmynte', x: 0.06, y: 0.73 },

// BAGERIET
{ name: 'Pain au chocolat fra Meyers', x: 0.06, y: 0.87 },
{ name: 'Øko. smørcrossaint fra Meyers', x: 0.06, y: 0.93 },

// KØD OG FISK
{ name: 'Rösti', x: 0.54, y: 0.19 },
{ name: 'Hjemmelavet hønsesalat', x: 0.54, y: 0.26 },
{ name: 'Crispy chicken', x: 0.54, y: 0.34 },
{ name: '2 brunchpølser', x: 0.54, y: 0.42 },
{ name: 'Koldrøget laks', x: 0.54, y: 0.51 },

// FINALEN
{ name: 'Lun rabarber crumble', x: 0.54, y: 0.63 },
{ name: 'Øllebrød med let vaniljeskum', x: 0.54, y: 0.72 },
{ name: '2 amerikanske pandekager', x: 0.54, y: 0.81 },

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

        const size = 14

        let darkPixels = 0

for (
  let px = x;
  px < Math.min(x + size, width);
  px++
) {
  for (
    let py = y;
    py < Math.min(y + size, height);
    py++
  ) {
            const color = image.getPixelColor(px, py)

            const rgba = Jimp.intToRGBA(color)

            const brightness =
              (rgba.r + rgba.g + rgba.b) / 3

            if (brightness < 110) {
              darkPixels++
            }
          }
        }

        // CHECKBOX THRESHOLD
        if (darkPixels > 6) {
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
