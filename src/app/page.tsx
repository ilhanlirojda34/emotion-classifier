'use client'

import { useState, useCallback, useRef } from 'react'
import AudioOrb from '@/components/AudioOrb'
import RecordControls from '@/components/RecordControls'
import ResultPanel from '@/components/ResultPanel'
import HistoryPanel from '@/components/HistoryPanel'
import SpectrumBars from '@/components/SpectrumBars'
import RecordTimer from '@/components/RecordTimer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { PredictionResult, HistoryItem } from '@/types/emotions'
import HistoryDrawer from '@/components/HistoryDrawer'

async function predict(blob: Blob): Promise<PredictionResult> {
  const form = new FormData()
  form.append('file', blob, 'audio.wav')
  const res = await fetch('https://rilhanli34-emotion-classifier.hf.space/predict', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('API error')
  return res.json()
}

export default function Home() {
  const { isRecording, analyserNode, analyserRef, startRecording, stopRecording } = useAudioRecorder()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [warnMessage, setWarnMessage] = useState<string | null>(null)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showWarn = useCallback((msg: string) => {
    setWarnMessage(msg)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    warnTimerRef.current = setTimeout(() => setWarnMessage(null), 3000)
  }, [])

  const handleResult = useCallback((res: PredictionResult, source: 'microphone' | 'file') => {
    setResult(res)
    setHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      emotion: res.emotion,
      confidence: res.confidence,
      timestamp: new Date(),
      source,
    }])
  }, [])

  const handleStopRecording = useCallback(async () => {
    const { blob, duration } = await stopRecording()
    if (duration < 2) {
      showWarn('En az 2 saniye konuş')
      return
    }
    setIsAnalyzing(true)
    setResult(null)
    try {
      const res = await predict(blob)
      if (res.no_speech) {
        showWarn('Ses algılanamadı, tekrar dene')
        return
      }
      handleResult(res, 'microphone')
    } catch (e) {
      console.error(e)
    } finally {
      setIsAnalyzing(false)
    }
  }, [stopRecording, handleResult, showWarn])

  const handleStartRecording = useCallback(() => {
    setResult(null)
    setWarnMessage(null)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    startRecording()
  }, [startRecording])

  const handleFileUpload = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setResult(null)
    try {
      const res = await predict(file)
      if (res.no_speech) {
        showWarn('Ses algılanamadı, farklı bir dosya dene')
        return
      }
      handleResult(res, 'file')
    } catch (e) {
      console.error(e)
    } finally {
      setIsAnalyzing(false)
    }
  }, [handleResult, showWarn])

  const activeEmotion = result?.emotion ?? null

  return (
    <main style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '260px 1fr 300px',
      overflow: 'hidden',
      zIndex: 1,
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,180,255,0.07) 0%, transparent 70%)',
          top: '-250px', left: '50%', transform: 'translateX(-50%)', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191,95,255,0.05) 0%, transparent 70%)',
          bottom: '-150px', right: '5%', filter: 'blur(60px)',
        }} />
      </div>

      {/* LEFT — History */}
      <aside style={{
        position: 'relative', zIndex: 1, padding: '28px 18px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(8, 12, 28, 0.7)', backdropFilter: 'blur(20px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <HistoryPanel items={history} />
      </aside>

      {/* CENTER */}
      <section style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px',
      }}>
        {/* Header */}
        <div style={{
          position: 'absolute', top: 24, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800,
            letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
          }}>
            Emo-Challenge 2026
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            letterSpacing: '0.15em', color: 'rgba(255,255,255,0.18)',
          }}>
            Grup 3 · BIL216 · İSTÜN
          </div>
        </div>

        {/* Orb */}
        <AudioOrb
          isRecording={isRecording}
          isAnalyzing={isAnalyzing}
          activeEmotion={activeEmotion}
          analyserNode={analyserNode}
          analyserRef={analyserRef}
        />
        
        {/* Spectrum bars */}
        <SpectrumBars
          analyserNode={analyserNode}
          analyserRef={analyserRef}
          isRecording={isRecording}
          activeEmotion={activeEmotion}
        />

        {/* Timer */}
        <RecordTimer isRecording={isRecording} />

        {/* Controls */}
        <RecordControls
          isRecording={isRecording}
          isAnalyzing={isAnalyzing}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onFileUpload={handleFileUpload}
        />

        {!isRecording && !isAnalyzing && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            letterSpacing: '0.12em', textAlign: 'center',
            animation: 'fade-up 0.6s ease forwards',
            color: warnMessage ? '#FFB800' : 'rgba(255,255,255,0.3)',
            transition: 'color 0.3s ease',
          }}>
            {warnMessage ?? (!result ? 'Mikrofona konuş veya WAV dosyası yükle' : '')}
          </p>
        )}
      </section>

      {/* RIGHT — Results */}
      <aside style={{
        position: 'relative', zIndex: 1, padding: '28px 18px',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(8, 12, 28, 0.7)', backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden',
      }}>
        {/* Model badge */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
          paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
          }}>
            Model
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '20px',
            fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em',
          }}>
            AudioCNN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#00FF88',
              boxShadow: '0 0 10px rgba(0,255,136,0.7)', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: '#00FF88', letterSpacing: '0.06em', fontWeight: 500,
            }}>
              95.65% accuracy
            </span>
          </div>
        </div>

        {/* Result panel */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <ResultPanel result={result} isAnalyzing={isAnalyzing} />
        </div>

        {/* Metadata footer */}
        <div style={{
          paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {[
            ['Mimari', '2D CNN · Mel Spec'],
            ['Veri seti', '676 kayıt · 5 sınıf'],
            ['Faz', 'Faz 3 · Web Demo'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em',
              }}>{k}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em',
              }}>{v}</span>
            </div>
          ))}
        </div>
      </aside>

        {/* History drawer toggle button */}
        <HistoryDrawer items={history} 
        />
    </main>
  )
}
