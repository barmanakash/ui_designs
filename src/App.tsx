import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { RequireAdmin, RequireAuth } from '@/components/layout/guards'
import { Spinner } from '@/components/ui/badge'
import { LEGAL_SLUGS } from '@/lib/legal'

// Every route is code-split.
const Home = lazy(() => import('@/pages/Home'))
const Explore = lazy(() => import('@/pages/Explore'))
const DesignDetail = lazy(() => import('@/pages/DesignDetail'))
const Find = lazy(() => import('@/pages/Find'))
const Moodboards = lazy(() => import('@/pages/Moodboards'))
const PublicBoard = lazy(() => import('@/pages/PublicBoard'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Submit = lazy(() => import('@/pages/Submit'))
const Jobs = lazy(() => import('@/pages/Jobs'))
const Login = lazy(() => import('@/pages/Login'))
const Account = lazy(() => import('@/pages/Account'))
const Admin = lazy(() => import('@/pages/Admin'))
const Legal = lazy(() => import('@/pages/Legal'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6" /></div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="design/:slug" element={<DesignDetail />} />
          <Route path="find" element={<Find />} />
          <Route path="moodboards" element={<RequireAuth><Moodboards /></RequireAuth>} />
          <Route path="board/:shareSlug" element={<PublicBoard />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="submit" element={<RequireAuth><Submit /></RequireAuth>} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="login" element={<Login />} />
          <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          {LEGAL_SLUGS.map((slug) => <Route key={slug} path={slug} element={<Legal />} />)}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
