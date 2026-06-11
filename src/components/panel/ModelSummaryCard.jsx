import { Panel, MetricCard } from '../design';
import { BarChart3, TrendingUp, Users, Clock, Scale } from 'lucide-react';

export default function ModelSummaryCard({ result, modelType }) {
  if (!result) return null;

  const r2 = result.r2 ?? result.r2_within ?? result.r2_overall;
  const adjR2 = result.adjR2;
  const fStat = result.fStat;
  const fPValue = result.fPValue;
  const nobs = result.nobs;
  const df = result.df;

  const modelLabel = {
    pooledOLS: 'Pooled OLS',
    fixedEffects: 'Fixed Effects (Within)',
    randomEffects: 'Random Effects (GLS)',
  }[modelType] || modelType;

  return (
    <Panel variant="emphasized" className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">Ringkasan Model</h3>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
          {modelLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {r2 != null && (
          <MetricCard label="R²" value={r2.toFixed(4)} />
        )}
        {adjR2 != null && (
          <MetricCard label="R² Adj" value={adjR2.toFixed(4)} />
        )}
        {fStat != null && (
          <MetricCard
            label="F-statistic"
            value={fStat.toFixed(3)}
            helper={fPValue != null ? `p = ${fPValue.toFixed(4)}` : undefined}
          />
        )}
        {nobs != null && (
          <MetricCard label="Observasi" value={nobs} icon={<Users className="w-4 h-4" />} />
        )}
      </div>

      {df != null && (
        <p className="text-xs text-muted">df residual: {df}</p>
      )}

      {result.durbinWatson != null && (
        <div className="flex items-center gap-2 text-sm">
          <Scale className="w-4 h-4 text-muted" />
          <span>Durbin-Watson: <strong>{result.durbinWatson.toFixed(3)}</strong></span>
          <span className="text-xs text-muted">
            {result.durbinWatson < 1.5 ? '(positif autocorrelation)' :
             result.durbinWatson > 2.5 ? '(negatif autocorrelation)' : '(OK)'}
          </span>
        </div>
      )}

      {result.varianceComponents && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <MetricCard label="σ²_u (between)" value={result.varianceComponents.sigma2_u.toFixed(4)} />
          <MetricCard label="σ²_e (within)" value={result.varianceComponents.sigma2_e.toFixed(4)} />
        </div>
      )}

      {result.notes && (
        <p className="text-xs text-muted italic">{result.notes}</p>
      )}
    </Panel>
  );
}
