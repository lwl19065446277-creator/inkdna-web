import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface SplashScreenProps {
  onEnter: () => void
}

const VIDEO_START_SECONDS = 0
const VIDEO_PLAYBACK_RATE = 1
const WHITE_FLASH_MS = 360
const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`
const FAST_VIDEO_SRC = assetPath('zizizi-fast-hq.mp4')
const MOBILE_VIDEO_SRC = assetPath('zizizi-mobile.mp4')

function getPreferredVideoSources() {
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 900px)').matches

  return isMobile
    ? [MOBILE_VIDEO_SRC, FAST_VIDEO_SRC]
    : [FAST_VIDEO_SRC, MOBILE_VIDEO_SRC]
}

function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    let timer = 0

    const done = () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', done)
      resolve()
    }

    timer = window.setTimeout(done, 700)
    video.addEventListener('loadedmetadata', done, { once: true })
  })
}

async function playVideoSource(video: HTMLVideoElement, src: string) {
  if (video.getAttribute('src') !== src) {
    video.src = src
    video.load()
  }

  await waitForMetadata(video)
  video.playbackRate = VIDEO_PLAYBACK_RATE

  if (Number.isFinite(video.duration) && video.duration > VIDEO_START_SECONDS) {
    video.currentTime = VIDEO_START_SECONDS
  }

  await video.play()
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const enterTimerRef = useRef<number | null>(null)
  const safetyTimerRef = useRef<number | null>(null)
  const hasEnteredRef = useRef(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [videoSrc, setVideoSrc] = useState(() => getPreferredVideoSources()[0])

  const enterWorkshop = useCallback(() => {
    if (hasEnteredRef.current) return
    hasEnteredRef.current = true
    setIsFlashing(true)

    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current)
    }
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current)
    }

    enterTimerRef.current = window.setTimeout(() => {
      onEnter()
    }, WHITE_FLASH_MS)
  }, [onEnter])

  const startAnimation = useCallback(async () => {
    if (hasStarted || isFlashing) return
    setHasStarted(true)

    const video = videoRef.current
    if (!video) {
      enterWorkshop()
      return
    }

    const sources = getPreferredVideoSources()

    try {
      await playVideoSource(video, sources[0])
      safetyTimerRef.current = window.setTimeout(() => {
        enterWorkshop()
      }, 9000)
    } catch (error) {
      console.warn('Primary splash video failed, trying fallback:', error)
      try {
        await playVideoSource(video, sources[1])
        safetyTimerRef.current = window.setTimeout(() => {
          enterWorkshop()
        }, 9000)
      } catch (fallbackError) {
        console.warn('Fallback splash video failed, entering workshop directly:', fallbackError)
        enterWorkshop()
      }
    }
  }, [enterWorkshop, hasStarted, isFlashing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setVideoSrc(getPreferredVideoSources()[0])
    video.load()

    return () => {
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current)
      }
      if (safetyTimerRef.current) {
        window.clearTimeout(safetyTimerRef.current)
      }
    }
  }, [])

  return (
    <div className={`splash-video ${hasStarted ? 'has-started' : ''} ${isFlashing ? 'is-flashing' : ''}`}>
      <video
        ref={videoRef}
        className="splash-video-media"
        src={videoSrc}
        muted
        playsInline
        preload="auto"
        onEnded={enterWorkshop}
      />

      <div className="splash-video-vignette" />
      <div className="splash-glass-gate">
        <div className="splash-glass-panel">
          <div className="splash-glass-kicker">InkDNA</div>
          <h1>字迹工坊</h1>
          <p>把一张手写参考图，变成可采集、可审核、可制字的字体项目。</p>
          <button
            className="splash-enter-button"
            type="button"
            onClick={startAnimation}
            disabled={hasStarted || isFlashing}
          >
            <span>进入字体工坊</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className={`splash-whiteout ${isFlashing ? 'active' : ''}`} />
    </div>
  )
}
