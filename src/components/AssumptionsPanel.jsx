// AssumptionsPanel — render assumption checks (Levene, Welch, Tukey HSD, DW, BP, residual normality)
// dari hasil analisis (t-test independent, ANOVA, regression).
// Designed to be plugged into ResultDisplay setelah hasil utama.

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import StatTooltip from './StatTooltip'

/**
 * @param {object} result - hasil analisis dari library stats
 * @param {string} type - 'ttest_independent' | 'anova' | 'regression_simple' | 'regression_multiple'
 */
export default function AssumptionsPanel({ result, type }) {
  if (!result) return null

  // ----- Independent t-test -----
  if (type === 'ttest_independent') {
    if (!result.student || !result.welch) return null
    return (
      <div className="mt-5 border border-gray-200/80 rounded-xl bg-white overflow-hidden">
        <Header title="Diagnostik Asumsi & Keputusan Test" />

        {/* Levene */}
        {result.levene && !result.levene.error && (
          <Row
            badge={result.levene.homogeneous ? 'ok' : 'warn'}
            label={<><StatTooltip term="levene">Levene's Test</StatTooltip> (homogenitas variansi)</>}
            value={`W(${result.levene.df1}, ${result.levene.df2}) = ${result.levene.W.toFixed(3)}, p = ${result.levene.pValue.toFixed(4)}`}
            meaning={result.levene.homogeneous
              ? 'Variansi homogen → Student\'s t-test layak dipakai'
              : 'Variansi tidak homogen → gunakan Welch\'s t-test'}
          />
        )}

        {/* Side-by-side Student vs Welch */}
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <TestCard
              label="Student's t-test"
              info="Pooled variance — asumsi variansi sama"
              t={result.student.t}
              df={result.student.df}
              p={result.student.pValue}
              ci={result.student.ci95}
              recommended={result.recommended === 'student'}
            />
            <TestCard
              label="Welch's t-test"
              info="Heteroscedasticity-robust"
              t={result.welch.t}
              df={result.welch.df}
              p={result.welch.pValue}
              ci={result.welch.ci95}
              recommended={result.recommended === 'welch'}
            />
          </div>
        </div>

        {/* Effect size with CI */}
        {result.cohensD_CI && (
          <Row
            badge="info"
            label={<><StatTooltip term="cohens_d">Cohen's d</StatTooltip> + 95% CI</>}
            value={`d = ${result.cohensD.toFixed(3)} [${result.cohensD_CI[0].toFixed(3)}, ${result.cohensD_CI[1].toFixed(3)}]${result.hedgesG ? ` · Hedges' g = ${result.hedgesG.toFixed(3)}` : ''}`}
            meaning={`Effect size: ${result.effectSize}`}
          />
        )}
      </div>
    )
  }

  // ----- ANOVA -----
  if (type === 'anova') {
    return (
      <div className="mt-5 border border-gray-200/80 rounded-xl bg-white overflow-hidden">
        <Header title="Diagnostik Asumsi & Post-hoc" />

        {result.levene && !result.levene.error && (
          <Row
            badge={result.levene.homogeneous ? 'ok' : 'warn'}
            label={<><StatTooltip term="levene">Levene's Test</StatTooltip></>}
            value={`W(${result.levene.df1}, ${result.levene.df2}) = ${result.levene.W.toFixed(3)}, p = ${result.levene.pValue.toFixed(4)}`}
            meaning={result.levene.homogeneous
              ? 'Variansi homogen → ANOVA klasik valid'
              : 'Variansi tidak homogen → Welch\'s ANOVA direkomendasikan'}
          />
        )}

        {result.welch && !result.welch.error && (
          <Row
            badge={result.recommended === 'welch' ? 'star' : 'info'}
            label="Welch's ANOVA (paralel)"
            value={`F(${result.welch.df1}, ${result.welch.df2.toFixed(2)}) = ${result.welch.F.toFixed(3)}, p = ${result.welch.pValue.toFixed(4)}`}
            meaning={result.recommended === 'welch' ? 'RECOMMENDED untuk pelaporan' : 'Sebagai cross-check'}
          />
        )}

        {result.etaSquared_CI && (
          <Row
            badge="info"
            label={<><StatTooltip term="eta_squared">η²</StatTooltip> + 95% CI · ω²</>}
            value={`η² = ${result.etaSquared.toFixed(3)} [${result.etaSquared_CI[0].toFixed(3)}, ${result.etaSquared_CI[1].toFixed(3)}] · ω² = ${result.omegaSquared.toFixed(3)}`}
            meaning={`Effect size: ${result.effectSize}`}
          />
        )}

        {/* Tukey HSD post-hoc */}
        {result.postHoc && result.postHoc.comparisons && result.postHoc.comparisons.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-sky-600" />
              <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                Tukey HSD Post-hoc
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="text-xs w-full min-w-[480px]">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">Pasangan</th>
                    <th className="text-right py-1.5 font-medium">Mean Diff</th>
                    <th className="text-right py-1.5 font-medium">95% CI</th>
                    <th className="text-right py-1.5 font-medium">p</th>
                    <th className="text-center py-1.5 font-medium">Sig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.postHoc.comparisons.map((c, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-gray-700">{c.group1} vs {c.group2}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-800">{c.meanDiff.toFixed(3)}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500">[{c.ci95[0].toFixed(2)}, {c.ci95[1].toFixed(2)}]</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-700">{c.pValue.toFixed(4)}</td>
                      <td className="py-1.5 text-center">
                        {c.significant
                          ? <span className="text-emerald-600 font-medium">✓</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ----- Regression (simple or multiple) -----
  if (type === 'regression_simple' || type === 'regression_multiple') {
    const a = result.assumptions
    if (!a) return null
    const dw = a.durbinWatson
    const bp = a.breuschPagan
    const rn = a.residualNormality

    return (
      <div className="mt-5 border border-gray-200/80 rounded-xl bg-white overflow-hidden">
        <Header title="Diagnostik Asumsi OLS" />

        {dw && !dw.error && (
          <Row
            badge={dw.DW >= 1.5 && dw.DW <= 2.5 ? 'ok' : 'warn'}
            label={<><StatTooltip term="durbin_watson">Durbin-Watson</StatTooltip> (autokorelasi)</>}
            value={`DW = ${dw.DW.toFixed(3)}`}
            meaning={dw.interpretation}
          />
        )}

        {bp && !bp.error && (
          <Row
            badge={bp.homoscedastic ? 'ok' : 'warn'}
            label={<><StatTooltip term="breusch_pagan">Breusch-Pagan</StatTooltip> (homoskedastisitas)</>}
            value={`LM(${bp.df}) = ${bp.LM.toFixed(3)}, p = ${bp.pValue.toFixed(4)}`}
            meaning={bp.homoscedastic
              ? 'Variansi residual konstan (homoscedastic)'
              : 'Heteroscedastic — pertimbangkan robust SE'}
          />
        )}

        {rn && !rn.error && (
          <Row
            badge={rn.isNormal ? 'ok' : 'warn'}
            label={`Normalitas Residual (${rn.method})`}
            value={`${rn.method === 'Shapiro-Wilk' ? 'W' : 'D'} = ${(rn.W ?? rn.D ?? 0).toFixed(3)}, p = ${rn.pValue.toFixed(4)}`}
            meaning={rn.isNormal ? 'Residual terdistribusi normal' : 'Residual tidak normal — interpretasi p-value hati-hati'}
          />
        )}

        {/* VIF for multiple regression */}
        {type === 'regression_multiple' && result.vifs && result.vifs.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-sky-600" />
              <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                VIF (Multikolinearitas)
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.vifs.map((v, i) => (
                <div key={i} className={`flex items-center justify-between text-xs px-3 py-2 rounded border ${v.vif > 10 ? 'bg-red-50 border-red-200' : v.vif > 5 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <span className="font-medium text-gray-700">{v.predictor}</span>
                  <span className={`tabular-nums font-mono ${v.vif > 10 ? 'text-red-700' : v.vif > 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {isFinite(v.vif) ? v.vif.toFixed(2) : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-gray-400 mt-2">
              Rule of thumb: VIF &gt; 10 = multikolinearitas serius; 5-10 = perhatikan; &lt; 5 = OK.
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

// ===== Sub-components =====

function Header({ title }) {
  return (
    <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
        {title}
      </div>
    </div>
  )
}

function Row({ badge, label, value, meaning }) {
  const badges = {
    ok: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, cls: 'bg-emerald-50' },
    warn: { icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, cls: 'bg-amber-50' },
    info: { icon: <Info className="w-4 h-4 text-sky-600" />, cls: 'bg-sky-50' },
    star: { icon: <span className="text-amber-500 text-base">★</span>, cls: 'bg-amber-50' },
  }
  const b = badges[badge] || badges.info
  return (
    <div className="border-t border-gray-100 first:border-t-0 px-4 py-3 flex items-start gap-3">
      <div className={`${b.cls} rounded-md p-1.5 shrink-0 mt-0.5`}>{b.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs tabular-nums text-gray-600 mt-0.5 font-mono">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{meaning}</div>
      </div>
    </div>
  )
}

function TestCard({ label, info, t, df, p, ci, recommended }) {
  return (
    <div className={`px-4 py-3 ${recommended ? 'bg-amber-50/40' : 'bg-white'} relative`}>
      {recommended && (
        <span className="absolute top-2 right-3 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
          ★ Recommended
        </span>
      )}
      <div className="text-xs font-semibold text-gray-800">{label}</div>
      <div className="text-[11px] text-gray-500 mb-2">{info}</div>
      <div className="space-y-0.5 text-xs tabular-nums font-mono">
        <div><span className="text-gray-500">t</span> = {t.toFixed(3)} <span className="text-gray-400">·</span> <span className="text-gray-500">df</span> = {df.toFixed(2)}</div>
        <div><span className="text-gray-500">p</span> = {p.toFixed(4)} {p < 0.05 && <span className="text-emerald-600 font-semibold">*</span>}</div>
        <div className="text-gray-500">95% CI [{ci[0].toFixed(3)}, {ci[1].toFixed(3)}]</div>
      </div>
    </div>
  )
}
