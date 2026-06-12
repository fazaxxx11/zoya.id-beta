import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from './lib/ThemeContext'
import Home from './pages/Home'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/ToastContainer'
import Aurora from './components/Aurora'
import BottomNav from './components/BottomNav'
import OnboardingTour from './components/OnboardingTour'
import FeedbackButton from './components/FeedbackButton'
import PromoBanner from './components/PromoBanner'
import AdminRoute from './components/AdminRoute'
import Logo from './components/Logo'
import './index.css'

// Lazy-loaded routes — split heavy pages into separate chunks so the initial
// bundle (Home + shell) stays small. Each page is code-split on demand.
const Statistik           = lazy(() => import('./pages/Statistik'))
const StatistikHistory    = lazy(() => import('./pages/StatistikHistory'))
const StatistikCompare    = lazy(() => import('./pages/StatistikCompare'))
const StatistikBatch      = lazy(() => import('./pages/StatistikBatch'))
const StatistikPower      = lazy(() => import('./pages/StatistikPower'))
const StatistikReport     = lazy(() => import('./pages/StatistikReport'))
const OnboardingStatistik = lazy(() => import('./pages/OnboardingStatistik'))
const Assessment          = lazy(() => import('./pages/Assessment'))
const AssessmentReport    = lazy(() => import('./pages/AssessmentReport'))
const Payment             = lazy(() => import('./pages/Payment'))
const Admin               = lazy(() => import('./pages/Admin'))
const OrderStatus         = lazy(() => import('./pages/OrderStatus'))
const Auth                = lazy(() => import('./pages/Auth'))
const UserDashboard       = lazy(() => import('./pages/UserDashboard'))
const Kuesioner           = lazy(() => import('./pages/Kuesioner'))
const Sampling            = lazy(() => import('./pages/Sampling'))
const ItemAnalysis        = lazy(() => import('./pages/ItemAnalysis'))
const References          = lazy(() => import('./pages/References'))
const Mediation           = lazy(() => import('./pages/Mediation'))
const Qualitative         = lazy(() => import('./pages/Qualitative'))
const SettingsPage        = lazy(() => import('./pages/Settings'))
const Logistic            = lazy(() => import('./pages/Logistic'))
const EFA                 = lazy(() => import('./pages/EFA'))
const SkripsiWizard       = lazy(() => import('./pages/SkripsiWizard'))
const Legal               = lazy(() => import('./pages/Legal'))
const Help                = lazy(() => import('./pages/Help'))
const Feedback            = lazy(() => import('./pages/Feedback'))
const EViews              = lazy(() => import('./pages/EViews'))
const NotFound            = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="font-heading font-semibold text-fg">Azezmen</div>
        <div className="w-32 h-2 bg-surface rounded animate-pulse"></div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="text-xs text-muted">Memuat halaman…</div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <Aurora />
      <BrowserRouter>
        <PromoBanner />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/statistik/start" element={<OnboardingStatistik />} />
          <Route path="/statistik/history" element={<StatistikHistory />} />
          <Route path="/statistik/compare" element={<StatistikCompare />} />
          <Route path="/statistik/batch" element={<StatistikBatch />} />
          <Route path="/statistik/power" element={<StatistikPower />} />
          <Route path="/statistik/report" element={<StatistikReport />} />
          <Route path="/kuesioner" element={<Kuesioner />} />
          <Route path="/sampling" element={<Sampling />} />
          <Route path="/butir-soal" element={<ItemAnalysis />} />
          <Route path="/referensi" element={<References />} />
          <Route path="/mediasi" element={<Mediation />} />
          <Route path="/kualitatif" element={<Qualitative />} />
          <Route path="/pengaturan" element={<SettingsPage />} />
          <Route path="/logistik" element={<Logistic />} />
          <Route path="/efa" element={<EFA />} />
          <Route path="/wizard" element={<SkripsiWizard />} />
          <Route path="/skripsi" element={<SkripsiWizard />} />
          <Route path="/privasi" element={<Legal kind="privacy" />} />
          <Route path="/syarat" element={<Legal kind="terms" />} />
          <Route path="/help" element={<Help />} />
          <Route path="/bantuan" element={<Help />} />
          <Route path="/eviews" element={<EViews />} />
          <Route path="/panel-data" element={<EViews />} />
          <Route path="/time-series" element={<EViews />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/saran" element={<Feedback />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/assessment/report" element={<AssessmentReport />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/profile" element={<UserDashboard />} />
          <Route path="/order" element={<OrderStatus />} />
          <Route path="/result" element={<OrderStatus />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <BottomNav />
        <OnboardingTour />
        <FeedbackButton />
      </BrowserRouter>
      <ToastContainer />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App