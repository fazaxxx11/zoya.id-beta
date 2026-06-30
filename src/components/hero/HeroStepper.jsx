// HeroStepper — stepper 3-step vertikal di kolom kanan hero Assessment.
// Step pertama aktif (filled accent), sisanya outlined.
// Connector: garis vertikal tipis antar step.
import { getAccentColor } from './accent-tokens';

/**
 * @param {object} props
 * @param {string[]} props.steps - label tiap step (cth: ['Rubrik', 'Jawaban siswa', 'Skor + komentar'])
 * @param {string} [props.accent] - 'gold' | 'teal' | 'terracotta' (default 'teal' untuk Assessment)
 */
export default function HeroStepper({ steps = [], accent = 'teal' }) {
  if (!steps.length) return null;
  const accentColor = getAccentColor(accent);
  return (
    <div
      className="rounded-lg border p-2.5"
      style={{
        borderColor: 'rgb(var(--border))',
        background: 'rgb(var(--card))',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: 'rgb(var(--muted))' }}
      >
        Alur
      </div>
      <div className="flex flex-col gap-1.5">
        {steps.map((label, i) => (
          <div key={i}>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                data-testid="step-circle"
                data-active={i === 0 ? 'true' : 'false'}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                style={
                  i === 0
                    ? { background: accentColor, color: 'rgb(var(--card))' }
                    : { border: `1px solid ${accentColor}`, color: accentColor, background: 'transparent' }
                }
              >
                {i + 1}
              </span>
              <span style={{ color: 'rgb(var(--fg))' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                data-testid="step-connector"
                className="w-px h-1.5 ml-[7px]"
                style={{ background: `color-mix(in srgb, ${accentColor} 40%, transparent)` }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
