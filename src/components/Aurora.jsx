/**
 * Background — subtle warm academic paper feel.
 * Light mode: very faint warm vignette.
 * Dark mode: deeper warm vignette.
 * No neon, no purple/magenta/cyan, no animated blobs.
 */
export default function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Warm vignette — radial gradient from center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgb(var(--surface)) 0%, rgb(var(--bg)) 70%)',
        }}
      />
      {/* Subtle warm tint in corners — very faint */}
      <div
        className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, rgb(180 160 120), transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 opacity-[0.02]"
        style={{
          background: 'radial-gradient(circle, rgb(120 140 130), transparent 70%)',
        }}
      />
    </div>
  )
}
