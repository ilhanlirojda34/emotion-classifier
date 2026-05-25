'use client'

import { useState } from 'react'
import { Clock, X } from 'lucide-react'
import HistoryPanel from './HistoryPanel'
import { HistoryItem } from '@/types/emotions'

interface HistoryDrawerProps {
  items: HistoryItem[]
}

export default function HistoryDrawer({ items }: HistoryDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger butonu */}
      <button
        onClick={() => setOpen(true)}
        className="history-trigger"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 40,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <Clock size={14} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          {items.length > 0 ? `${items.length} tahmin` : 'Geçmiş'}
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 280,
        background: 'rgba(8, 12, 28, 0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        zIndex: 51,
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}>
            Geçmiş Tahminler
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
        <HistoryPanel items={items} />
      </div>
    </>
  )
}