'use client'

import { useEffect, useRef } from 'react'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

export default function SmoothScrollWrapper({ children }: { children: React.ReactNode }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scroll = new LocomotiveScroll({
      el: containerRef.current as HTMLElement,
      smooth: true,
      lerp: 0.07, // adjust smoothness (0.05 = very smooth)
    })

    return () => {
      scroll.destroy()
    }
  }, [])

  return (
    <div id="smooth-scroll" data-scroll-container ref={containerRef}>
      {children}
    </div>
  )
}
