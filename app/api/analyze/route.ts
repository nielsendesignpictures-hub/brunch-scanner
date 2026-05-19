 import { NextResponse } from 'next/server'
import { Jimp, intToRGBA } from 'jimp'

export async function POST(req: Request) {

  try {

    const formData = await req.formData()

    const file = formData.get('image') as File

    const buffer = Buffer.from(
      await file.arrayBuffer()
    )

    const image = await Jimp.read(buffer)

    // Fast størrelse
    image.resize({
      w: 1000,
      h: 1400,
    })

    // Røræg checkbox område
    const startX = 160
    const startY = 540

    const size = 60

    let darkPixels = 0

    for (
      let x = startX;
      x < startX + size;
      x++
    ) {

      for (
        let y = startY;
        y < startY + size;
        y++
      ) {

        const color =
          image.getPixelColor(x, y)

        const rgba = intToRGBA(color)

        const brightness =
          (rgba.r + rgba.g + rgba.b) / 3

        // Mørke pixels
        if (brightness < 160) {
          darkPixels++
        }
      }
    }

    // DEBUG BOX
    for (
      let x = startX;
      x < startX + size;
      x++
    ) {

      image.setPixelColor(
        0xff0000ff,
        x,
        startY
      )

      image.setPixelColor(
        0xff0000ff,
        x,
        startY + size
      )
    }

    for (
      let y = startY;
      y < startY + size;
      y++
    ) {

      image.setPixelColor(
        0xff0000ff,
        startX,
        y
      )

      image.setPixelColor(
        0xff0000ff,
        startX + size,
        y
      )
    }

    const base64 =
      await image.getBase64('image/png')

    return NextResponse.json({

      success: true,

      darkPixels,

      checked: darkPixels > 120,

      image: base64,

      totals: {
        'Røræg':
          darkPixels > 120 ? 1 : 0,
      },

    })

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: String(error),
    })

  }
}
