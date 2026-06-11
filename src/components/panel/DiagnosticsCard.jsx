import { Panel } from '../design';
import { ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const TEST_INFO = {
  breuschPagan: {
    name: 'Breusch-Pagan',
    h0: 'Homoscedastisitas (variance konstan)',
    rejectMsg: 'Heteroscedastisitas terdeteksi — variance residual tidak konstan.',
    failMsg: 'Tidak ada heteroscedastisitas terdeteksi — variance konstan.',
  },
  whiteTest: {
    name: "White's Test",
    h0: 'Homoscedastisitas (tidak ada pola pada variance)',
    rejectMsg: 'Heteroscedastisitas terdeteksi via White test.',
    failMsg: 'Tidak ada heteroscedastisitas terdeteksi via White test.',
  },
  wooldridgeTest: {
    name: 'Wooldridge (Serial Correlation)',
    h0: 'Tidak ada serial correlation (ρ = -0.5)',
    rejectMsg: 'Serial correlation terdeteksi pada first-difference residuals.',
    failMsg: 'Tidak ada serial correlation terdeteksi.',
  },
  breuschPaganLM: {
    name: 'Breusch-Pagan LM (Random Effects)',
    h0: 'Tidak ada panel-level heteroscedastisitas',
    rejectMsg: 'Panel-level heteroscedastisitas terdeteksi — pertimbangkan robust SE.',
    failMsg: 'Tidak ada panel-level heteroscedastisitas terdeteksi.',
  },
};

export default function DiagnosticsCard({ type, result }) {
  if (!result) return null;

  const info = TEST_INFO[type] || { name: type, h0: '', rejectMsg: '', failMsg: '' };
  const isProblem = result.isSignificant;
  const Icon = isProblem ? AlertTriangle : CheckCircle;
  const color = isProblem ? 'text-amber-600' : 'text-emerald-600';
  const bgColor = isProblem ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

  return (
    <Panel variant="default" className={`p-4 border ${bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h4 className="font-heading font-semibold">{info.name}</h4>
        {result.variant && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border">
            {result.variant}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted uppercase">Statistik</div>
          <div className="font-bold font-mono">{result.statistic?.toFixed(4)}</div>
        </div>
        {result.df != null && (
          <div>
            <div className="text-xs text-muted uppercase">df</div>
            <div className="font-bold font-mono">{result.df}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted uppercase">p-value</div>
          <div className="font-bold font-mono">{result.pValue?.toFixed(4)}</div>
        </div>
      </div>

      <div className={`flex items-start gap-2 p-2 rounded text-sm ${bgColor}`}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
        <div>
          <div className={`font-medium ${color}`}>
            {isProblem ? info.rejectMsg : info.failMsg}
          </div>
          <div className="text-xs text-muted mt-1">H₀: {info.h0}</div>
        </div>
      </div>

      {type === 'whiteTest' && result.nTerms != null && (
        <div className="text-xs text-muted mt-2">
          White terms: {result.nTerms} generated, {result.nTermsAfterRank} setelah rank check
        </div>
      )}

      {type === 'wooldridgeTest' && result.rho != null && (
        <div className="text-xs text-muted mt-2">
          ρ (first-difference): {result.rho.toFixed(4)} | H₀: ρ = -0.5
        </div>
      )}
    </Panel>
  );
}
