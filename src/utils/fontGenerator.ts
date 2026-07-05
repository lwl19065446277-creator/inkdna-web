import { saveAs } from 'file-saver'
import * as opentype from 'opentype.js'
import type { HandwritingMetrics } from './imageMetrics'

interface FontOptions {
  familyName?: string
  styleName?: string
  metrics?: HandwritingMetrics | null
  chars: string[]
}

function createNotdefGlyph(): opentype.Glyph {
  const path = new opentype.Path()
  path.moveTo(50, 0)
  path.lineTo(550, 0)
  path.lineTo(550, 700)
  path.lineTo(50, 700)
  path.close()
  path.moveTo(100, 50)
  path.lineTo(500, 50)
  path.lineTo(500, 650)
  path.lineTo(100, 650)
  path.close()
  return new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 600,
    path
  })
}

function createSpaceGlyph(): opentype.Glyph {
  return new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 300,
    path: new opentype.Path()
  })
}

function createGlyphFromChar(
  char: string,
  metrics: HandwritingMetrics | null
): opentype.Glyph {
  const unicode = char.charCodeAt(0)
  const advanceWidth = 900
  const ascent = 800

  const renderSize = 200
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = renderSize
  tempCanvas.height = renderSize
  const tempCtx = tempCanvas.getContext('2d')!

  tempCtx.fillStyle = '#000'
  tempCtx.fillRect(0, 0, renderSize, renderSize)
  tempCtx.fillStyle = '#fff'
  tempCtx.textAlign = 'center'
  tempCtx.textBaseline = 'middle'

  const fontSize = 140
  tempCtx.font = `${fontSize}px "KaiTi", "STKaiti", "Kaiti SC", "SimSun", "Microsoft YaHei", serif`
  tempCtx.fillText(char, renderSize / 2, renderSize / 2 + 10)

  const imageData = tempCtx.getImageData(0, 0, renderSize, renderSize)
  const data = imageData.data
  const threshold = 128

  const path = new opentype.Path()
  const pixelSize = (advanceWidth * 0.8) / renderSize
  const offsetX = advanceWidth * 0.1
  const jitterAmount = metrics ? Math.min(4, metrics.strokeWeight * 0.5) : 2

  const drawnPixels = new Set<string>()

  for (let y = 0; y < renderSize; y += 3) {
    for (let x = 0; x < renderSize; x += 3) {
      const idx = (y * renderSize + x) * 4
      const brightness = data[idx]
      if (brightness > threshold) {
        if (Math.random() < 0.65) {
          const key = `${Math.floor(x / 3)}-${Math.floor(y / 3)}`
          if (drawnPixels.has(key)) continue
          drawnPixels.add(key)

          const rx = offsetX + x * pixelSize
          const ry = ascent - y * pixelSize - 80
          const psz = pixelSize * 2.5

          const jx = (Math.random() - 0.5) * jitterAmount
          const jy = (Math.random() - 0.5) * jitterAmount

          path.moveTo(rx + jx, ry + jy - psz)
          path.lineTo(rx + psz + jx, ry + jy - psz)
          path.lineTo(rx + psz + jx, ry + jy)
          path.lineTo(rx + jx, ry + jy)
          path.close()
        }
      }
    }
  }

  if (path.commands.length === 0) {
    const cx = advanceWidth / 2
    const cy = ascent / 2 - 50
    const r = 100
    path.moveTo(cx + r, cy)
    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      path.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    }
    path.close()
  }

  const glyphName = `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`

  return new opentype.Glyph({
    name: glyphName,
    unicode,
    advanceWidth,
    path
  })
}

export async function generateFont(options: FontOptions): Promise<opentype.Font> {
  const {
    familyName = 'InkDNA Handwriting',
    styleName = 'Regular',
    metrics = null,
    chars
  } = options

  const uniqueSet = new Set(chars)
  const uniqueChars = Array.from(uniqueSet).filter(c => c.charCodeAt(0) > 32)

  const notdef = createNotdefGlyph()
  const space = createSpaceGlyph()

  const glyphs: opentype.Glyph[] = [notdef, space]
  uniqueChars.forEach((char) => {
    glyphs.push(createGlyphFromChar(char, metrics))
  })

  const font = new opentype.Font({
    familyName,
    styleName,
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs
  })

  return font
}

export async function downloadFont(
  chars: string[],
  metrics: HandwritingMetrics | null,
  familyName: string = 'InkDNA Handwriting'
): Promise<void> {
  try {
    const font = await generateFont({
      familyName,
      styleName: 'Regular',
      metrics,
      chars
    })

    const arrayBuffer = font.toArrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'font/ttf' })
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    saveAs(blob, `InkDNA_${familyName.replace(/\s+/g, '_')}_${timestamp}.ttf`)
  } catch (error) {
    console.error('Font generation failed:', error)
    throw error
  }
}
