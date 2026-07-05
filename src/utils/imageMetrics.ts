export interface HandwritingMetrics {
  inkDensity: number
  whitespace: number
  strokeWeight: number
  slant: number
  clarity: number
  threshold: number
  width: number
  height: number
}

export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxWidth = 900
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function otsuThreshold(grayData: Uint8ClampedArray, length: number): number {
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < length; i++) {
    histogram[grayData[i]]++
  }

  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }

  let sumB = 0
  let wB = 0
  let wF = 0
  let maxVariance = 0
  let threshold = 128

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    wF = length - wB
    if (wF === 0) break

    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) * (mB - mF)

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }

  return threshold
}

function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imageData
  const gray = new Uint8ClampedArray(width * height)

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  return gray
}

function calculateSlant(inkCoords: Array<{ x: number; y: number }>): number {
  if (inkCoords.length < 2) return 0

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  const n = inkCoords.length

  for (const { x, y } of inkCoords) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denominator = n * sumX2 - sumX * sumX
  if (Math.abs(denominator) < 0.001) return 0

  const slope = (n * sumXY - sumX * sumY) / denominator
  const angle = Math.atan(slope) * (180 / Math.PI)
  return angle
}

function estimateStrokeWeight(
  binaryData: Uint8ClampedArray,
  width: number,
  height: number,
  inkCount: number
): number {
  if (inkCount === 0) return 0

  let neighborCount = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      if (binaryData[idx] === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nidx = (y + dy) * width + (x + dx)
            if (binaryData[nidx] === 0) {
              neighborCount++
            }
          }
        }
      }
    }
  }

  const avgNeighbors = inkCount > 0 ? neighborCount / inkCount : 0
  const estimatedWeight = Math.max(1, avgNeighbors / 4)
  return Math.min(estimatedWeight, 20)
}

export function analyzeHandwritingImage(canvas: HTMLCanvasElement): {
  metrics: HandwritingMetrics
  binaryData: Uint8ClampedArray
  threshold: number
} {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const grayData = toGrayscale(imageData)
  const threshold = otsuThreshold(grayData, width * height)

  const binaryData = new Uint8ClampedArray(width * height)
  let inkCount = 0
  const inkCoords: Array<{ x: number; y: number }> = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (grayData[idx] < threshold) {
        binaryData[idx] = 0
        inkCount++
        inkCoords.push({ x, y })
      } else {
        binaryData[idx] = 255
      }
    }
  }

  const totalPixels = width * height
  const inkDensity = inkCount / totalPixels
  const whitespace = 1 - inkDensity
  const strokeWeight = estimateStrokeWeight(binaryData, width, height, inkCount)
  const slant = calculateSlant(inkCoords)

  let contrastSum = 0
  for (let i = 0; i < width * height; i++) {
    contrastSum += Math.abs(grayData[i] - threshold)
  }
  const avgContrast = contrastSum / totalPixels
  const clarity = Math.min(1, avgContrast / 64)

  return {
    metrics: {
      inkDensity,
      whitespace,
      strokeWeight,
      slant,
      clarity,
      threshold,
      width,
      height
    },
    binaryData,
    threshold
  }
}

export function createBinarizedPreview(
  canvas: HTMLCanvasElement,
  binaryData: Uint8ClampedArray
): string {
  const { width, height } = canvas
  const previewCanvas = document.createElement('canvas')
  previewCanvas.width = width
  previewCanvas.height = height
  const ctx = previewCanvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)

  for (let i = 0; i < width * height; i++) {
    const val = binaryData[i]
    imageData.data[i * 4] = val
    imageData.data[i * 4 + 1] = val
    imageData.data[i * 4 + 2] = val
    imageData.data[i * 4 + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
  return previewCanvas.toDataURL('image/png')
}

export function calculateQualityScore(metrics: HandwritingMetrics): {
  total: number
  referenceQuality: number
  clarityScore: number
  manufacturability: number
  suggestions: string[]
} {
  const clarityScore = Math.round(metrics.clarity * 100)

  const idealDensity = 0.05
  const densityScore = Math.round((1 - Math.min(1, Math.abs(metrics.inkDensity - idealDensity) / 0.15)) * 100)

  const idealWhitespace = 0.95
  const whitespaceScore = Math.round((1 - Math.min(1, Math.abs(metrics.whitespace - idealWhitespace) / 0.15)) * 100)

  const slantAbs = Math.abs(metrics.slant)
  const slantScore = slantAbs < 15 ? 100 : Math.round(Math.max(0, 100 - (slantAbs - 15) * 5))

  const total = Math.round(
    clarityScore * 0.4 +
    densityScore * 0.3 +
    whitespaceScore * 0.2 +
    slantScore * 0.1
  )

  const suggestions: string[] = []
  if (clarityScore < 70) suggestions.push('建议提高对比度，使用黑色笔在白纸上书写')
  if (densityScore < 70) {
    if (metrics.inkDensity < 0.02) suggestions.push('笔迹较淡，建议使用黑色中性笔')
    if (metrics.inkDensity > 0.1) suggestions.push('笔迹过密，建议减少背景干扰')
  }
  if (slantScore < 80) suggestions.push('书写倾斜角度较大，建议保持纸张端正')
  if (suggestions.length === 0) suggestions.push('参考图质量良好，可进行下一步采集')

  suggestions.push('白纸正面拍摄或扫描')
  suggestions.push('避免阴影、透视、反光')
  suggestions.push('单字不要贴边')
  suggestions.push('保留自然快写风格，不要刻意写成楷体')

  return {
    total: Math.max(0, Math.min(100, total)),
    referenceQuality: total,
    clarityScore,
    manufacturability: Math.round((clarityScore + densityScore) / 2),
    suggestions
  }
}
