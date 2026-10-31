import { Link } from 'react-router-dom'
import { Seo } from '@/components/layout/Seo'
import { EmptyState } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <Seo title="Page not found" noindex />
      <EmptyState
        title="Page not found"
        body="The page may have moved or the link may be incorrect."
        action={<Button asChild><Link to="/">Back to home</Link></Button>}
      />
    </div>
  )
}
