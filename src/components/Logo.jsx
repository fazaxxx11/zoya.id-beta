// Reusable Azezmen logo.
// Uses /brand/azezmen-lockup.svg for horizontal, /brand/azezmen-mark.svg for square.

import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../lib/brand'

/**
 * @param {object} props
 * @param {number} [props.size=32]    - pixel size (square mark) or height for lockup
 * @param {boolean} [props.withText]  - show lockup SVG with text
 * @param {boolean} [props.link]      - wrap in <Link to="/">
 * @param {string} [props.className]
 */
export default function Logo({ size = 32, withText = false, link = false, className = '' }) {
  const mark = withText ? (
    <img
      src="/brand/azezmen-lockup.svg"
      alt={BRAND_NAME}
      height={size}
      style={{ height: size, width: 'auto', display: 'block' }}
      draggable={false}
    />
  ) : (
    <img
      src="/brand/azezmen-mark.svg"
      width={size}
      height={size}
      alt={BRAND_NAME}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      draggable={false}
    />
  )

  if (link) return <Link to="/" aria-label={`${BRAND_NAME} home`} className={className}>{mark}</Link>
  return <span className={className}>{mark}</span>
}
