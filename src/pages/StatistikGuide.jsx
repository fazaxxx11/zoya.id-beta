import { lazy, Suspense } from 'react'

const StatistikGuide = lazy(() => import('../components/StatistikGuide'))

const StatistikGuidePage = () => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>}>
    <StatistikGuide />
  </Suspense>
)

export default StatistikGuidePage
