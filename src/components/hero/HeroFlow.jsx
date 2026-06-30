// HeroFlow — flow horizontal pill inline di hero Statistik.
// Visualisasi alur tool: Upload → Pilih uji → Hasil.
// Step pertama aktif (accent border), sisanya netral (border default).
import { ArrowRight } from 'lucide-react';
import { getAccentColor } from './accent-tokens';

/**
 * @param {object} props
 * @param {string[]} props.steps - label tiap step (cth: ['Upload', 'Pilih uji', 'Hasil'])
 * @param {string} [props.accent] - 'gold' | 'teal' | 'terracotta' (default 'gold')
 */
export default function HeroFlow({ steps = [], accent = 'gold' }) {
  if (!steps.length) return null;
  const accentColor = getAccentColor(accent);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            data-testid="flow-step"
            data-active={i === 0 ? 'true' : 'false'}
            className="px-2.5 py-1 rounded-full text-xs font-medium border"
            style={
              i === 0
                ? { borderColor: 'rgb(var(--accent) / 0.5)', background: 'rgb(var(--accent) / 0.08)', color: accentColor }
                : { borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }
            }
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight
              data-testid="flow-arrow"
              className="w-3 h-3"
              style={{ color: accentColor }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
