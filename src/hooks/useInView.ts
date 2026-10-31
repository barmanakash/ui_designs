import { useEffect, useRef } from 'react'

/** Calls `onVisible` whenever the returned ref's element scrolls into view (infinite scroll sentinel). */
export function useInView<T extends HTMLElement>(onVisible: () => void, enabled = true) {
  const ref = useRef<T>(null)
  const cb = useRef(onVisible)
  cb.current = onVisible
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && cb.current(), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [enabled])
  return ref
}
