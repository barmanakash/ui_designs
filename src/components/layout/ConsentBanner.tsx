import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { analyticsEnabled, getConsent, setConsent } from '@/lib/analytics'

/** Asks before any analytics loads. Hidden when analytics is off or a choice was already made. */
export function ConsentBanner() {
  const [visible, setVisible] = useState(() => analyticsEnabled && getConsent() === null)
  if (!visible) return null

  const choose = (value: 'granted' | 'denied') => {
    setConsent(value)
    setVisible(false)
  }

  return (
    <div role="dialog" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 shadow-lg">
      <p className="text-sm">
        We use privacy-friendly analytics to see which designs are useful. It only runs if you accept.{' '}
        <Link to="/privacy" className="text-accent underline">Privacy Policy</Link>
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => choose('denied')}>Decline</Button>
        <Button size="sm" onClick={() => choose('granted')}>Accept</Button>
      </div>
    </div>
  )
}
