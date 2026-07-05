declare module 'opentype.js' {
  export class Path {
    commands: PathCommand[]
    moveTo(x: number, y: number): void
    lineTo(x: number, y: number): void
    curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void
    quadTo(x1: number, y1: number, x: number, y: number): void
    close(): void
    extend(path: Path): void
  }

  export interface PathCommand {
    type: 'M' | 'L' | 'C' | 'Q' | 'Z'
    x?: number
    y?: number
    x1?: number
    y1?: number
    x2?: number
    y2?: number
  }

  export interface GlyphOptions {
    name: string
    unicode: number
    advanceWidth: number
    path?: Path
    xMin?: number
    yMin?: number
    xMax?: number
    yMax?: number
  }

  export class Glyph {
    name: string
    unicode: number
    advanceWidth: number
    path: Path
    constructor(options: GlyphOptions)
  }

  export interface FontOptions {
    familyName: string
    styleName: string
    unitsPerEm?: number
    ascender: number
    descender: number
    glyphs: Glyph[]
  }

  export class Font {
    familyName: string
    styleName: string
    unitsPerEm: number
    ascender: number
    descender: number
    glyphs: {
      length: number
      get(index: number): Glyph
    }
    constructor(options: FontOptions)
    toArrayBuffer(): ArrayBuffer
    download(fileName: string): void
  }

  export function load(url: string, callback: (err: Error | null, font: Font) => void): void
  export function parse(buffer: ArrayBuffer): Font
}
