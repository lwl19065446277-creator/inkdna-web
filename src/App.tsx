import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Download,
  Copy,
  Grid3X3,
  CheckCircle2,
  Circle,
  Package,
  BarChart3,
  PenTool,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Type,
  Loader2
} from 'lucide-react'
import SplashScreen from './components/SplashScreen'
import FontPreviewPage from './components/FontPreviewPage'
import {
  extractUniqueChars,
  countChars,
  buildGlyphManifestCsv
} from './utils/text'
import {
  loadImageToCanvas,
  analyzeHandwritingImage,
  createBinarizedPreview,
  calculateQualityScore,
  type HandwritingMetrics
} from './utils/imageMetrics'
import {
  drawCollectionTemplate,
  canvasToDataURL,
  defaultTemplateSettings,
  type TemplateSettings
} from './utils/templateCanvas'
import {
  exportProjectZip,
  downloadTextFile,
  downloadCanvasAsPng,
  copyToClipboard
} from './utils/exportProject'
import { downloadFont } from './utils/fontGenerator'

const DEFAULT_TEXT = `如果你一直做属于你自己的东西，事情最后都会变好。这个世界不只是指全世界都会爱你，而是会有一小群人爱你，但他们爱得很深，爱得很有力量，那种力量会让你终于也能开始喜欢你自己，一直到最后，直到你不必证明任何事情。当代电影大师`

const DEMO_LINES = [
  '如果你一直做属于你自己的东西，',
  '事情最后都会变好。',
  '这个世界不只是指全世界都会爱你，',
  '而是会有一小群人爱你。',
  'InkDNA 字迹工坊'
]

type View = 'workshop' | 'preview'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [view, setView] = useState<View>('workshop')
  const [targetText, setTargetText] = useState(DEFAULT_TEXT)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [binarizedImageUrl, setBinarizedImageUrl] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<HandwritingMetrics | null>(null)
  const [qualityScore, setQualityScore] = useState<ReturnType<typeof calculateQualityScore> | null>(null)
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null)
  const [templateCanvasRef, setTemplateCanvasRef] = useState<HTMLCanvasElement | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingFont, setIsGeneratingFont] = useState(false)
  const [templateSettings] = useState<TemplateSettings>(defaultTemplateSettings)
  const [toast, setToast] = useState<string | null>(null)
  const [fontFamilyName, setFontFamilyName] = useState('InkDNA Handwriting')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uniqueChars = useMemo(() => extractUniqueChars(targetText), [targetText])
  const charStats = useMemo(() => countChars(targetText), [targetText])
  const csvContent = useMemo(() => buildGlyphManifestCsv(uniqueChars), [uniqueChars])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件')
      return
    }
    setIsAnalyzing(true)
    try {
      const canvas = await loadImageToCanvas(file)
      const { metrics: analyzedMetrics, binaryData } = analyzeHandwritingImage(canvas)
      setOriginalImageUrl(canvas.toDataURL('image/png'))
      setBinarizedImageUrl(createBinarizedPreview(canvas, binaryData))
      setMetrics(analyzedMetrics)
      setQualityScore(calculateQualityScore(analyzedMetrics))
      showToast('笔迹分析完成')
    } catch (error) {
      console.error('Image analysis failed:', error)
      showToast('图片分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }, [showToast])

  const handleLoadDemoReference = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 820
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fbfaf6'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(24,24,27,0.05)'
      ctx.lineWidth = 1
      for (let y = 64; y < canvas.height; y += 92) {
        ctx.beginPath()
        ctx.moveTo(72, y)
        ctx.lineTo(canvas.width - 72, y + 6)
        ctx.stroke()
      }

      ctx.fillStyle = '#111'
      ctx.textBaseline = 'middle'
      ctx.font = '46px "KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", serif'
      DEMO_LINES.forEach((line, row) => {
        let x = 96 + (row % 2) * 24
        const y = 140 + row * 112
        for (const char of line) {
          ctx.save()
          const jitterY = (Math.random() - 0.5) * 10
          const rotate = (Math.random() - 0.5) * 0.08
          ctx.translate(x, y + jitterY)
          ctx.rotate(rotate)
          ctx.scale(0.92 + Math.random() * 0.14, 0.96 + Math.random() * 0.12)
          ctx.fillText(char, 0, 0)
          ctx.restore()
          x += char.match(/[A-Za-z]/) ? 28 : 48 + (Math.random() - 0.5) * 10
        }
      })

      ctx.font = '38px "KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", serif'
      ctx.fillText('一 当 代 电 影 大 师', 720, 700)

      const { metrics: analyzedMetrics, binaryData } = analyzeHandwritingImage(canvas)
      setOriginalImageUrl(canvas.toDataURL('image/png'))
      setBinarizedImageUrl(createBinarizedPreview(canvas, binaryData))
      setMetrics(analyzedMetrics)
      setQualityScore(calculateQualityScore(analyzedMetrics))
      showToast('已载入演示样张')
    } catch (error) {
      console.error('Demo image generation failed:', error)
      showToast('演示样张生成失败')
    } finally {
      setIsAnalyzing(false)
    }
  }, [showToast])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
    e.target.value = ''
  }, [handleImageUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageUpload(file)
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleGenerateTemplate = useCallback(() => {
    if (uniqueChars.length === 0) {
      showToast('请先输入目标文字')
      return
    }
    setIsGeneratingTemplate(true)
    try {
      const canvas = drawCollectionTemplate(uniqueChars, templateSettings)
      setTemplateCanvasRef(canvas)
      setTemplatePreviewUrl(canvasToDataURL(canvas))
    } catch (error) {
      console.error('Template generation failed:', error)
      showToast('模板生成失败')
    } finally {
      setIsGeneratingTemplate(false)
    }
  }, [uniqueChars, templateSettings, showToast])

  const handleDownloadCsv = useCallback(() => {
    downloadTextFile(csvContent, 'glyph_manifest.csv')
    showToast('CSV 已下载')
  }, [csvContent, showToast])

  const handleCopyCsv = useCallback(async () => {
    const success = await copyToClipboard(csvContent)
    showToast(success ? 'CSV 已复制' : '复制失败')
  }, [csvContent, showToast])

  const handleDownloadTemplate = useCallback(async () => {
    if (!templateCanvasRef) {
      showToast('请先生成模板')
      return
    }
    await downloadCanvasAsPng(templateCanvasRef, 'collection_template.png')
    showToast('模板已下载')
  }, [templateCanvasRef, showToast])

  const handleExportProject = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportProjectZip({
        targetText, uniqueChars, metrics, templateSettings, csvContent, templateCanvas: templateCanvasRef
      })
      showToast('项目包导出成功')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [targetText, uniqueChars, metrics, templateSettings, csvContent, templateCanvasRef, showToast])

  const handleGenerateFont = useCallback(async () => {
    if (uniqueChars.length === 0) {
      showToast('请先输入目标文字')
      return
    }
    setIsGeneratingFont(true)
    try {
      await downloadFont(uniqueChars, metrics, fontFamilyName)
      showToast('TTF 字体已下载')
    } catch (error) {
      console.error('Font generation failed:', error)
      showToast('字体生成失败')
    } finally {
      setIsGeneratingFont(false)
    }
  }, [uniqueChars, metrics, fontFamilyName, showToast])

  const handleResetDemoText = useCallback(() => {
    setTargetText(DEFAULT_TEXT)
    showToast('已恢复默认演示文本')
  }, [showToast])

  const handleClearImage = useCallback(() => {
    setOriginalImageUrl(null)
    setBinarizedImageUrl(null)
    setMetrics(null)
    setQualityScore(null)
  }, [])

  useEffect(() => {
    handleGenerateTemplate()
  }, [])

  const checklistItems = [
    { label: '参考图已上传', done: !!originalImageUrl },
    { label: '笔迹指标已生成', done: !!metrics },
    { label: '目标字表已生成', done: uniqueChars.length > 0 },
    { label: '采集模板已生成', done: !!templateCanvasRef },
    { label: '项目包可导出', done: uniqueChars.length > 0 },
    { label: '字体可预览下载', done: uniqueChars.length > 0 },
  ]

  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />
  }

  if (view === 'preview') {
    return (
      <div className="app-root preview-root">
        {toast && <div className="toast">{toast}</div>}
        <FontPreviewPage
          chars={uniqueChars}
          metrics={metrics}
          fontFamilyName={fontFamilyName}
          onBack={() => setView('workshop')}
        />
      </div>
    )
  }

  return (
    <div className="app-root workshop-root">
      {toast && <div className="toast">{toast}</div>}

      <nav className="topnav">
        <div className="topnav-left">
          <button className="topnav-home" onClick={() => setShowSplash(true)}>
            <PenTool size={16} />
          </button>
          <div className="topnav-divider" />
          <span className="topnav-brand">InkDNA</span>
          <span className="topnav-sep">/</span>
          <span className="topnav-section">字迹工坊</span>
        </div>
        <div className="topnav-center">
          <button
            className={`tab ${(view as View) === 'workshop' ? 'active' : ''}`}
            onClick={() => setView('workshop')}
          >
            工作台
          </button>
          <button
            className={`tab ${(view as View) === 'preview' ? 'active' : ''}`}
            onClick={() => setView('preview')}
          >
            字体预览
          </button>
        </div>
        <div className="topnav-right">
          <button
            className="btn-line"
            onClick={() => setView('preview')}
            disabled={uniqueChars.length === 0}
          >
            <Eye size={15} />
            预览字体
          </button>
          <button
            className="btn-primary-line"
            onClick={handleGenerateFont}
            disabled={isGeneratingFont || uniqueChars.length === 0}
            title="实验预览字体，仅用于演示字库流程，不代表最终商业字体。"
          >
            {isGeneratingFont ? <Loader2 size={15} className="spin" /> : <Type size={15} />}
            实验 TTF
          </button>
        </div>
      </nav>

      <main className="workshop">
        <section className="workshop-hero" aria-label="InkDNA project index">
          <div className="workshop-index">
            <span>NO.</span>
            <strong>01</strong>
            <em>2026 / DAISY DNA</em>
          </div>
          <div className="workshop-title-stack">
            <span>Reference Capture</span>
            <span>Glyph Manifest</span>
            <b>InkDNA Workshop</b>
            <span>Template System</span>
            <span>Experimental TTF</span>
          </div>
          <div className="workshop-hero-note">
            <span>ART DIRECTION</span>
            <b>LIVE TYPE ARCHIVE</b>
            <p>把散落的笔迹，整理成可运行的字库。</p>
          </div>
        </section>
        <div className="workshop-grid">
          <section className="card">
            <div className="card-head">
              <ImageIcon size={15} />
              <h2>参考图分析</h2>
            </div>
            <div className="card-body">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              {!originalImageUrl ? (
                <div
                  className="dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-icon">
                    <Upload size={28} />
                  </div>
                  <p className="dropzone-title">上传手写参考图</p>
                  <p className="dropzone-hint">拖拽或点击 · PNG / JPG · 白底黑字</p>
                  <button
                    type="button"
                    className="btn-line btn-sm dropzone-demo"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleLoadDemoReference()
                    }}
                  >
                    <PenTool size={13} /> 载入演示样张
                  </button>
                </div>
              ) : (
                <div className="image-stack">
                  <div className="img-block">
                    <span className="img-label">原图</span>
                    <div className="img-box">
                      <img src={originalImageUrl} alt="原图" />
                    </div>
                  </div>
                  <div className="img-block">
                    <span className="img-label">二值化</span>
                    <div className="img-box">
                      {binarizedImageUrl && <img src={binarizedImageUrl} alt="二值化" />}
                    </div>
                  </div>
                  <button className="btn-ghost-line btn-sm" onClick={handleClearImage}>
                    <Trash2 size={13} /> 重新上传
                  </button>
                  <button className="btn-line btn-sm" onClick={handleLoadDemoReference}>
                    <PenTool size={13} /> 演示样张
                  </button>
                </div>
              )}
              {isAnalyzing && (
                <div className="loading-mask">
                  <RefreshCw size={24} className="spin" />
                  <p>分析笔迹 DNA...</p>
                </div>
              )}
            </div>
          </section>

          <section className="card card-wide">
            <div className="card-head">
              <FileText size={15} />
              <h2>字表工作区</h2>
            </div>
            <div className="card-body">
              <label className="field-label">目标文字</label>
              <div className="field-toolbar">
                <button className="btn-ghost-line btn-sm" onClick={handleResetDemoText}>
                  <RefreshCw size={13} /> 恢复演示文本
                </button>
                <span>用于现场展示：字表统计、模板生成、项目包导出</span>
              </div>
              <textarea
                className="text-area"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                rows={5}
              />

              <div className="stat-row">
                <div className="stat">
                  <span className="stat-num">{charStats.total}</span>
                  <span className="stat-name">总字符</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{charStats.unique}</span>
                  <span className="stat-name">唯一</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{charStats.uniqueCjk}</span>
                  <span className="stat-name">汉字</span>
                </div>
                <div className="stat accent">
                  <span className="stat-num">{charStats.pending}</span>
                  <span className="stat-name">待采集</span>
                </div>
              </div>

              <label className="field-label">字体名称</label>
              <input
                type="text"
                className="text-input"
                value={fontFamilyName}
                onChange={(e) => setFontFamilyName(e.target.value)}
              />

              <div className="char-section">
                <div className="char-head">
                  <span className="char-title">唯一字表</span>
                  <span className="char-count">{uniqueChars.length}</span>
                </div>
                <div className="char-grid">
                  {uniqueChars.map((char, idx) => (
                    <div key={idx} className="char-cell" title={`U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`}>
                      {char}
                    </div>
                  ))}
                </div>
              </div>

              <div className="action-row">
                <button className="btn-ghost-line btn-sm" onClick={handleDownloadCsv}>
                  <Download size={13} /> CSV
                </button>
                <button className="btn-ghost-line btn-sm" onClick={handleCopyCsv}>
                  <Copy size={13} /> 复制
                </button>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <BarChart3 size={15} />
              <h2>分析与导出</h2>
            </div>
            <div className="card-body">
              {qualityScore ? (
                <div className="score-block">
                  <div className="score-main">
                    <span className="score-num">{qualityScore.total}</span>
                    <span className="score-suffix">/100</span>
                  </div>
                  <div className="score-bars">
                    <div className="sbar">
                      <span className="sbar-label">参考图</span>
                      <div className="sbar-track"><div className="sbar-fill" style={{ width: `${qualityScore.referenceQuality}%` }} /></div>
                    </div>
                    <div className="sbar">
                      <span className="sbar-label">清晰度</span>
                      <div className="sbar-track"><div className="sbar-fill" style={{ width: `${qualityScore.clarityScore}%` }} /></div>
                    </div>
                    <div className="sbar">
                      <span className="sbar-label">可制字</span>
                      <div className="sbar-track"><div className="sbar-fill" style={{ width: `${qualityScore.manufacturability}%` }} /></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted-text">上传参考图后显示评分</p>
              )}

              {metrics && (
                <div className="metrics-block">
                  <div className="metric"><span>墨密度</span><b>{(metrics.inkDensity * 100).toFixed(1)}%</b></div>
                  <div className="metric"><span>留白率</span><b>{(metrics.whitespace * 100).toFixed(1)}%</b></div>
                  <div className="metric"><span>笔画粗细</span><b>{metrics.strokeWeight.toFixed(1)}px</b></div>
                  <div className="metric"><span>倾斜角</span><b>{metrics.slant.toFixed(1)}°</b></div>
                </div>
              )}

              {qualityScore && qualityScore.suggestions.length > 0 && (
                <div className="suggest-block">
                  <div className="suggest-head"><AlertCircle size={13} /> 采集建议</div>
                  <ul className="suggest-list">
                    {qualityScore.suggestions.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div className="checklist">
                {checklistItems.map((item, i) => (
                  <div key={i} className={`check-item ${item.done ? 'done' : ''}`}>
                    {item.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn-primary-line btn-block"
                onClick={handleExportProject}
                disabled={isExporting || uniqueChars.length === 0}
              >
                {isExporting ? <RefreshCw size={15} className="spin" /> : <Package size={15} />}
                导出项目包
              </button>
            </div>
          </section>
        </div>

        <section className="template-card">
          <div className="card-head">
            <Grid3X3 size={15} />
            <h2>采集模板</h2>
            <div className="card-actions">
              <button className="btn-ghost-line btn-sm" onClick={handleGenerateTemplate} disabled={isGeneratingTemplate}>
                {isGeneratingTemplate ? <RefreshCw size={13} className="spin" /> : <Eye size={13} />}
                生成
              </button>
              <button className="btn-line btn-sm" onClick={handleDownloadTemplate} disabled={!templateCanvasRef}>
                <Download size={13} /> PNG
              </button>
            </div>
          </div>
          <div className="template-body">
            {templatePreviewUrl ? (
              <img src={templatePreviewUrl} alt="采集模板" className="template-img" />
            ) : (
              <div className="template-empty">
                <Grid3X3 size={28} />
                <p>点击生成采集模板</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
