import { Panel } from '../design';
import { Scale, CheckCircle, AlertTriangle } from 'lucide-react';

export default function HausmanCard({ result }) {
  if (!result) return null;

  const isFE = result.recommendation === 'FE';
  const Icon = isFE ? AlertTriangle : CheckCircle;
  const color = isFE ? 'text-amber-600' : 'text-emerald-600';
  const bgColor = isFE ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

  return (
    <Panel variant="default" className={`p-5 border ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">Uji Hausman</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">Statistik</div>
          <div className="text-xl font-bold font-mono">{result.statistic?.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">df</div>
          <div className="text-xl font-bold font-mono">{result.df}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">p-value</div>
          <div className="text-xl font-bold font-mono">{result.pValue?.toFixed(4)}</div>
        </div>
      </div>

      <div className={`flex items-start gap-3 p-3 rounded-lg ${bgColor}`}>
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${color}`} />
        <div>
          <div className={`font-semibold ${color}`}>
            {isFE
              ? 'Gunakan Fixed Effects — Perbedaan signifikan antara FE dan RE'
              : 'Gunakan Random Effects — Tidak ada perbedaan signifikan'}
          </div>
          <div className="text-sm text-muted mt-1">
            {isFE
              ? 'H₀ ditolak (p < 0.05). Estimator RE inkonsisten — korelasi antara entity effects dan regressor terdeteksi.'
              : 'H₀ tidak ditolak (p ≥ 0.05). Estimator RE konsisten dan lebih efisien.'}
          </div>
        </div>
      </div>

      {result.warning && (
        <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {result.warning}
        </div>
      )}
    </Panel>
  );
}
