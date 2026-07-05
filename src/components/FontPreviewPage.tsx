import { useState, useMemo, useRef, useEffect } from 'react'
import { ArrowLeft, Download, Eye, Loader2, Type, RotateCcw, AlertTriangle } from 'lucide-react'
import { generateFont } from '../utils/fontGenerator'
import type { HandwritingMetrics } from '../utils/imageMetrics'

interface FontPreviewPageProps {
  chars: string[]
  metrics: HandwritingMetrics | null
  fontFamilyName: string
  onBack: () => void
}

const PREVIEW_SIZES = [96, 64, 48, 32, 24, 16]
const PRESENT_TEXTS = [
  '永和九年岁在癸丑暮春之初',
  'The quick brown fox jumps',
  '会于会稽山阴之兰亭修禊事也',
  ' InkDNA 字迹工坊 0123456789'
]

export default function FontPreviewPage({
  chars,
  metrics,
  fontFamilyName,
  onBack
}: FontPreviewPageProps) {
  const [customText, setCustomText] = useState(' InkDNA 字迹工坊\n永和九年岁在癸丑暮春之初\nThe quick brown fox jumps over')
  const [fontUrl, setFontUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const fontFaceRef = useRef<string | null>(null)

  const cssFontFamily = useMemo(() => `"${fontFamilyName}", serif`, [fontFamilyName])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const font = await generateFont({
        familyName: fontFamilyName,
        styleName: 'Regular',
        metrics,
        chars
      })
      const arrayBuffer = font.toArrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'font/ttf' })
      const url = URL.createObjectURL(blob)
      setFontUrl(url)
      setGenerated(true)

      if (fontFaceRef.current) {
        document.fonts.delete(new FontFace(fontFamilyName, `url(${fontFaceRef.current})`))
      }
      const fontFace = new FontFace(fontFamilyName, `url(${url})`)
      await fontFace.load()
      document.fonts.add(fontFace)
      fontFaceRef.current = url
    } catch (error) {
      console.error('Font preview generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!fontUrl) return
    setIsDownloading(true)
    try {
      const response = await fetch(fontUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.download = `InkDNA_${fontFamilyName.replace(/\s+/g, '_')}_${timestamp}.ttf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (fontFaceRef.current) {
        URL.revokeObjectURL(fontFaceRef.current)
      }
    }
  }, [])

  return (
    <div className="preview-page">
      <header className="preview-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>返回工作台</span>
        </button>
        <div className="preview-header-center">
          <h1 className="preview-title">实验字体预览</h1>
          <p className="preview-subtitle">{fontFamilyName} · {chars.length} 字符 · 流程验证版</p>
        </div>
        <div className="preview-header-right">
          <button
            className="btn-line"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={15} className="spin" /> : <Eye size={15} />}
            {generated ? '重新生成预览' : '生成预览'}
          </button>
          <button
            className="btn-primary-line"
            onClick={handleDownload}
            disabled={!fontUrl || isDownloading}
          >
            {isDownloading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            下载 TTF
          </button>
        </div>
      </header>

      <div className="preview-body">
        <section className="preview-hero" aria-label="InkDNA preview specimen">
          <div className="preview-hero-index">
            <span>NO.</span>
            <strong>02</strong>
            <em>DAISY SPECIMEN</em>
          </div>
          <div className="preview-hero-title">
            <span>InkDNA</span>
            <b>TYPE PREVIEW</b>
            <span>GLYPH TEST</span>
          </div>
          <div className="preview-hero-flower" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        {!generated ? (
          <div className="preview-empty">
            <div className="empty-glow">
              <Type size={32} />
            </div>
            <h2>点击“生成预览”查看实验字体效果</h2>
            <p>这里用于验证字表、映射和安装包流程。最终商用字体仍需要真实手写采集、切分和逐字审核。</p>
            <button className="btn-primary-line btn-lg" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
              生成字体预览
            </button>
          </div>
        ) : (
          <>
            <section className="preview-note">
              <AlertTriangle size={16} />
              <div>
                <b>实验说明</b>
                <span>此处 TTF 是浏览器端流程预览，用于比赛演示“字表到字体”的闭环，不代表最终可商用字形。</span>
              </div>
            </section>

            <section className="preview-section">
              <div className="section-label">
                <span className="label-dot" />
                实时预览
              </div>
              <div className="preview-input-wrap">
                <textarea
                  className="preview-text-input"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={3}
                  placeholder="输入要预览的文字..."
                />
                <button className="btn-ghost-line btn-sm" onClick={() => setCustomText('')}>
                  <RotateCcw size={13} />
                  清空
                </button>
              </div>
              <div className="preview-render-box">
                {customText.split('\n').map((line, i) => (
                  <p key={i} className="render-line" style={{ fontFamily: cssFontFamily }}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            </section>

            <section className="preview-section">
              <div className="section-label">
                <span className="label-dot" />
                多尺寸预览
              </div>
              <div className="size-grid">
                {PREVIEW_SIZES.map(size => (
                  <div key={size} className="size-row">
                    <span className="size-tag">{size}px</span>
                    <span
                      className="size-sample"
                      style={{ fontFamily: cssFontFamily, fontSize: `${size}px` }}
                    >
                      永和九年 InkDNA
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="preview-section">
              <div className="section-label">
                <span className="label-dot" />
                示例文案
              </div>
              <div className="present-grid">
                {PRESENT_TEXTS.map((text, i) => (
                  <div key={i} className="present-card">
                    <p style={{ fontFamily: cssFontFamily }}>{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="preview-section">
              <div className="section-label">
                <span className="label-dot" />
                字符集 ({chars.length})
              </div>
              <div className="charset-grid">
                {chars.map((char, i) => (
                  <div key={i} className="charset-cell" style={{ fontFamily: cssFontFamily }}>
                    {char}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
