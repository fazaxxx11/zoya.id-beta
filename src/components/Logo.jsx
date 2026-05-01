// Reusable Zoya logo.
// Prefers /logo.png if user dropped the original raster file there;
// falls back to /logo.svg (recreation) automatically.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../lib/brand'

/**
 * @param {object} props
 * @param {number} [props.size=32]    - pixel size (square)
 * @param {boolean} [props.withText]  - show "zoya.id" text next to mark
 * @param {boolean} [props.link]      - wrap in <Link to="/">
 * @param {string} [props.className]
 */
export default function Logo({ size = 32, withText = false, link = false, className = '' }) {
  const [pngFailed, setPngFailed] = useState(false)
  const src = pngFailed ? '/logo.svg' : '/logo.png'

  const mark = (
    <img
      src={src}
      width={size}
      height={size}
      alt={BRAND_NAME}
      onError={() => !pngFailed && setPngFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      draggable={false}
    />
  )

  const content = withText ? (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      <span
        className="font-bold tracking-tight"
        style={{
          fontSize: Math.max(14, size * 0.55),
          background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {BRAND_NAME}
      </span>
    </span>
  ) : (
    <span className={className}>{mark}</span>
  )

  if (link) return <Link to="/" aria-label={`${BRAND_NAME} home`}>{content}</Link>
  return content
}
