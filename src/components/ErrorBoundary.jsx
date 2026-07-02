import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Class-based ErrorBoundary (one of the few cases yg butuh class component).
 * Wrap App tree-nya supaya kalau ada uncaught error, tampil UI fallback
 * bukan white-screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ backgroundColor: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}>
        <div className="rounded-2xl shadow-xl max-w-lg w-full p-8 text-center border"
             style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Oops, ada yang salah
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--muted))' }}>
            Halaman tidak bisa ditampilkan. Coba reload atau kembali ke home.
            Data Anda tetap aman tersimpan.
          </p>

          {/* Error details, kasih opsi expand */}
          {this.state.error && (
            <details className="text-left mb-6 rounded-lg p-3"
                     style={{ backgroundColor: 'rgb(var(--border) / 0.3)' }}>
              <summary className="cursor-pointer text-sm font-medium" style={{ color: 'rgb(var(--fg))' }}>
                Detail teknis (untuk developer)
              </summary>
              <pre className="mt-2 text-xs text-red-500 overflow-auto whitespace-pre-wrap break-words">
                {import.meta.env.DEV
                  ? String(this.state.error?.stack || this.state.error?.message || this.state.error)
                  : String(this.state.error?.message || this.state.error)}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <button
              onClick={this.handleGoHome}
              className="flex-1 px-4 py-3 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
            >
              <Home className="w-4 h-4" /> Ke Home
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90"
              style={{ background: 'rgb(var(--accent))' }}
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
