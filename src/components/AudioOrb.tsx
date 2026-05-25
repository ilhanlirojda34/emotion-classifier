'use client'

import { useEffect, useRef, useState } from 'react'
import { EmotionKey, EMOTIONS } from '@/types/emotions'

interface AudioOrbProps {
  isRecording: boolean
  isAnalyzing: boolean
  activeEmotion: EmotionKey | null
  analyserNode: AnalyserNode | null
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}

type OrbState = 'idle' | 'recording' | 'analyzing' | 'result'

export default function AudioOrb({
  isRecording,
  isAnalyzing,
  activeEmotion,
  analyserRef,
}: AudioOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const orbStateRef = useRef<OrbState>('idle')
  const colorRef = useRef('#00B4FF')
  const glowRef = useRef('rgba(0, 180, 255, 0.3)')
  const [orbState, setOrbState] = useState<OrbState>('idle')

  const emotion = activeEmotion ? EMOTIONS[activeEmotion] : null
  const activeColor = emotion?.color ?? '#00B4FF'
  const activeGlow = emotion?.glow ?? 'rgba(0, 180, 255, 0.3)'

  useEffect(() => {
    const next = isRecording ? 'recording'
      : isAnalyzing ? 'analyzing'
      : activeEmotion ? 'result'
      : 'idle'
    orbStateRef.current = next
    setOrbState(next)
  }, [isRecording, isAnalyzing, activeEmotion])

  useEffect(() => { colorRef.current = activeColor }, [activeColor])
  useEffect(() => { glowRef.current = activeGlow }, [activeGlow])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMobile = window.innerWidth < 768
    const SIZE = isMobile ? 300 : 500
    canvas.width = SIZE
    canvas.height = SIZE
    const cx = SIZE / 2
    const cy = SIZE / 2
    const RADIUS = isMobile ? 85 : 140        // çember yarıçapı
    const WAVE_RADIUS = isMobile ? 108 : 175  // dalga çizgisinin ortalama yarıçapı (çemberden dışarıda)
    const WAVE_AMP = 30                       // maksimum dalga yüksekliği

    let phase = 0

    const hexToRgb = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    })

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)

      const state = orbStateRef.current
      const color = colorRef.current
      const rgb = hexToRgb(color)
      const analyser = analyserRef.current

      // Audio data
      const bufferLength = analyser?.fftSize ?? 1024
      const timeData = new Uint8Array(bufferLength)
      const freqData = new Uint8Array(analyser?.frequencyBinCount ?? 512)

      if (analyser && state === 'recording') {
        analyser.getByteTimeDomainData(timeData)
        analyser.getByteFrequencyData(freqData)
      }

      let volume = 0
      if (analyser && state === 'recording') {
        volume = freqData.reduce((a, b) => a + b, 0) / freqData.length / 255
      }

      // Decorative dashed ring
      ctx.save()
      ctx.setLineDash([3, 9])
      ctx.beginPath()
      ctx.arc(cx, cy, WAVE_RADIUS + 20, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${state === 'idle' ? 0.04 : 0.08})`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Core sphere gradient
      const grad = ctx.createRadialGradient(cx - 35, cy - 35, 8, cx, cy, RADIUS)
      if (state === 'idle') {
        grad.addColorStop(0, 'rgba(20, 35, 75, 0.95)')
        grad.addColorStop(0.6, 'rgba(10, 18, 42, 0.98)')
        grad.addColorStop(1, 'rgba(5, 8, 20, 1)')
      } else {
        const intensity = state === 'recording' ? 0.22 + volume * 0.18 : 0.28
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`)
        grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`)
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02)`)
      }
      ctx.beginPath()
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Sphere border — sabit çember
      ctx.beginPath()
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${state === 'idle' ? 0.15 : 0.6})`
      ctx.lineWidth = 1.5
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
      ctx.shadowBlur = state !== 'idle' ? 12 : 0
      ctx.stroke()
      ctx.shadowBlur = 0

      // Inner highlight
      const hl = ctx.createRadialGradient(cx - 45, cy - 50, 2, cx - 28, cy - 32, 70)
      hl.addColorStop(0, 'rgba(255,255,255,0.1)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, RADIUS - 1, 0, Math.PI * 2)
      ctx.fillStyle = hl
      ctx.fill()

      // ── WAVEFORM ──────────────────────────────────────────────
      // Çemberin dışında, polar koordinatta düz dalga gibi davranan çizgi
      const POINTS = 256
      ctx.beginPath()

      for (let i = 0; i <= POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2 - Math.PI / 2

        let radialAmp = 0

        if (analyser && state === 'recording') {
          // Her nokta için ses verisinden gerçek zamanlı değer al
          const idx = Math.floor((i / POINTS) * timeData.length)
          const sample = timeData[idx] ?? 128
          // 128 = sıfır noktası, -128/+128 arası normalize
          const normalized = (sample - 128) / 128
          radialAmp = normalized * WAVE_AMP
        } else if (state === 'analyzing') {
          radialAmp = Math.sin(phase * 3 + i * 0.15) * 12
                    + Math.sin(phase * 5.5 + i * 0.28) * 7
        } else if (state === 'result') {
          radialAmp = Math.sin(phase * 1.2 + i * 0.07) * 4
        } else {
          // Idle: çok hafif nefes alan dalga
          radialAmp = Math.sin(phase * 0.8 + i * 0.05) * 2.5
        }

        const r = WAVE_RADIUS + radialAmp
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()

      const waveOpacity = state === 'idle' ? 0.18
        : state === 'recording' ? 0.85
        : state === 'analyzing' ? 0.65
        : 0.45

      const waveWidth = state === 'recording' ? 2 + volume * 1.5 : 1.5

      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${waveOpacity})`
      ctx.lineWidth = waveWidth
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`
      ctx.shadowBlur = state === 'recording' ? 8 + volume * 12 : state === 'idle' ? 0 : 6
      ctx.stroke()
      ctx.shadowBlur = 0
      // ──────────────────────────────────────────────────────────

      // Analyzing: spinning arc
      if (state === 'analyzing') {
        const arcStart = phase % (Math.PI * 2)
        ctx.beginPath()
        ctx.arc(cx, cy, RADIUS + 18, arcStart, arcStart + Math.PI * 1.3)
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`
        ctx.lineWidth = 2
        ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`
        ctx.shadowBlur = 10
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Recording dot — tepede yanıp sönen nokta
      if (state === 'recording') {
        const dotOpacity = 0.4 + Math.sin(phase * 5) * 0.6
        ctx.beginPath()
        ctx.arc(cx, cy - RADIUS + 14, 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dotOpacity})`
        ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      phase += state === 'analyzing' ? 0.06
        : state === 'recording' ? 0.04
        : 0.012

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [analyserRef])

  const stateLabel = {
    idle: 'Hazır',
    recording: 'Dinleniyor...',
    analyzing: 'Analiz ediliyor...',
    result: emotion?.label ?? '',
  }[orbState]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{
        position: 'relative', 
        width: typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 500, 
        height: typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'float 5s ease-in-out infinite',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: orbState !== 'idle'
            ? `radial-gradient(circle, ${activeGlow} 0%, transparent 65%)`
            : 'radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 65%)',
          transition: 'background 1.2s ease', filter: 'blur(35px)',
        }} />

        {/* Pulse rings */}
        {isRecording && [0, 0.6, 1.2].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: 60 - i * 15,
            borderRadius: '50%',
            border: `1px solid ${activeColor}`,
            opacity: 0,
            animation: 'pulse-ring 2.4s ease-out infinite',
            animationDelay: `${delay}s`,
          }} />
        ))}

        <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 1 }} />
      </div>

      {/* State label */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.25em',
        color: orbState === 'idle' ? 'rgba(255,255,255,0.25)' : activeColor,
        textTransform: 'uppercase', transition: 'color 0.8s ease',
        textShadow: orbState !== 'idle' ? `0 0 24px ${activeGlow}` : 'none',
        animation: isRecording ? 'recording-pulse 1.8s ease-in-out infinite' : 'none',
      }}>
        {stateLabel}
      </div>
    </div>
  )
}