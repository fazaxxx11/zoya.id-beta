/**
 * Background aurora — 3 colored blobs blur'd yang slow-animate.
 * Mount sekali di App. Fixed position, di belakang semua konten.
 *
 * Light mode: subtle (opacity 0.5).
 * Dark mode: lebih dramatic (opacity 0.35 dengan blur lebih besar).
 */
export default function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Blob 1: deep purple, top-left */}
      <div
        className="aurora-blob animate-aurora-1"
        style={{
          top: '-15%',
          left: '-15%',
          width: '55vw',
          height: '55vw',
          background: 'radial-gradient(circle, rgb(147 51 234 / 0.7), transparent 70%)',
        }}
      />
      {/* Blob 2: magenta/pink, top-right */}
      <div
        className="aurora-blob animate-aurora-2"
        style={{
          top: '10%',
          right: '-15%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgb(217 70 239 / 0.6), transparent 70%)',
          animationDelay: '-5s',
        }}
      />
      {/* Blob 3: indigo/violet, bottom-center */}
      <div
        className="aurora-blob animate-aurora-3"
        style={{
          bottom: '-20%',
          left: '20%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgb(99 102 241 / 0.55), transparent 70%)',
          animationDelay: '-10s',
        }}
      />
      {/* Blob 4: cyan accent (sparkle of contrast) */}
      <div
        className="aurora-blob animate-aurora-1"
        style={{
          top: '50%',
          right: '20%',
          width: '30vw',
          height: '30vw',
          background: 'radial-gradient(circle, rgb(56 189 248 / 0.35), transparent 70%)',
          animationDelay: '-15s',
        }}
      />
    </div>
  )
}
