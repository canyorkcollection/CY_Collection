'use client'
import { useState, useEffect } from 'react'

const slides = [
  { bg: '#2a2826', label: 'The Collection' },
  { bg: '#1e2420', label: 'Can York · Ibiza' },
  { bg: '#22201e', label: 'Works on Paper' },
  { bg: '#1a1e22', label: 'Contemporary Art' },
]

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'relative',
      height: '70vh',
      overflow: 'hidden',
      background: slides[current].bg,
      transition: 'background 1s ease',
    }}>
      {/* Placeholder artwork silhouette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '220px',
          height: '280px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 60px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Slide label */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '40px',
      }}>
        <p className="label-dark" style={{ marginBottom: '8px' }}>
          {slides[current].label}
        </p>
      </div>

      {/* Dots */}
      <div style={{
        position: 'absolute',
        bottom: '44px',
        right: '40px',
        display: 'flex',
        gap: '6px',
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: i === current ? 'rgba(247,246,240,0.7)' : 'rgba(247,246,240,0.2)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
