// HeroPreview — preview mini struktur kuesioner di kolom kanan hero Kuesioner.
// Tampilkan section + item bars (placeholder visual struktur).
import { getAccentColor } from './accent-tokens';

/**
 * @param {object} props
 * @param {Array<{title: string, items: number}>} props.sections - daftar section
 * @param {string} [props.accent] - 'gold' | 'teal' | 'terracotta' (default 'terracotta' untuk Kuesioner)
 */
export default function HeroPreview({ sections = [], accent = 'terracotta' }) {
  if (!sections.length) return null;
  const accentColor = getAccentColor(accent);
  return (
    <div
      className="rounded-lg border p-2"
      style={{
        borderColor: 'rgb(var(--border))',
        background: 'rgb(var(--card))',
      }}
    >
      <div
        className="text-[10px] mb-1.5"
        style={{ color: 'rgb(var(--muted))' }}
      >
        Struktur
      </div>
      {sections.map((sec, i) => (
        <div key={i} className="mb-1.5 last:mb-0">
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: 'rgb(var(--fg))' }}
          >
            {sec.title}
          </div>
          {Array.from({ length: sec.items }).map((_, j) => (
            <div
              key={j}
              data-testid="preview-bar"
              className="h-1 rounded mb-0.5 last:mb-0"
              style={{
                background: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
                width: j === sec.items - 1 ? '55%' : '100%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
