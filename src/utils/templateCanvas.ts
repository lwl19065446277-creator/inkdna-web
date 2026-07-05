export interface TemplateSettings {
  columns: number
  cellSize: number
  padding: number
  headerHeight: number
  footerHeight: number
}

export const defaultTemplateSettings: TemplateSettings = {
  columns: 12,
  cellSize: 96,
  padding: 40,
  headerHeight: 80,
  footerHeight: 60
}

export function drawCollectionTemplate(
  chars: string[],
  settings: TemplateSettings = defaultTemplateSettings
): HTMLCanvasElement {
  const { columns, cellSize, padding, headerHeight, footerHeight } = settings

  const rows = Math.ceil(chars.length / columns)
  const width = padding * 2 + columns * cellSize
  const height = padding * 2 + headerHeight + rows * cellSize + footerHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('InkDNA 字迹采集模板', width / 2, padding + headerHeight / 2)

  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  ctx.strokeRect(
    padding,
    padding + headerHeight,
    columns * cellSize,
    rows * cellSize
  )

  for (let col = 1; col < columns; col++) {
    const x = padding + col * cellSize
    ctx.beginPath()
    ctx.moveTo(x, padding + headerHeight)
    ctx.lineTo(x, padding + headerHeight + rows * cellSize)
    ctx.stroke()
  }

  for (let row = 1; row < rows; row++) {
    const y = padding + headerHeight + row * cellSize
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(padding + columns * cellSize, y)
    ctx.stroke()
  }

  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#b0b0b0'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  ctx.font = '48px system-ui, -apple-system, "KaiTi", "STKaiti", serif'
  ctx.fillStyle = '#e8e8e8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < chars.length; i++) {
    const row = Math.floor(i / columns)
    const col = i % columns
    const x = padding + col * cellSize
    const y = padding + headerHeight + row * cellSize

    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#c0c0c0'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const unicode = 'U+' + chars[i].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
    ctx.fillText(unicode, x + 4, y + 4)

    ctx.font = '48px system-ui, -apple-system, "KaiTi", "STKaiti", serif'
    ctx.fillStyle = '#d8d8d8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(chars[i], x + cellSize / 2, y + cellSize / 2)
  }

  ctx.font = '13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#888888'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    '请用黑色中性笔在每格内手写对应字，拍照或扫描后回传',
    width / 2,
    height - padding - footerHeight / 2
  )

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas to Blob conversion failed'))
      }
    }, type)
  })
}

export function canvasToDataURL(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return canvas.toDataURL(type)
}
