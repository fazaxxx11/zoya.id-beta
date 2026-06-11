import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, BarChart3, Download, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import PageHeader from '../components/PageHeader';
import PanelConfig from '../components/panel/PanelConfig';
import ModelSummaryCard from '../components/panel/ModelSummaryCard';
import CoefficientsTable from '../components/panel/CoefficientsTable';
import HausmanCard from '../components/panel/HausmanCard';
import DiagnosticsCard from '../components/panel/DiagnosticsCard';
import {
  pooledOLSAdapter, fixedEffectsAdapter, randomEffectsAdapter,
  hausmanTestAdapter, breuschPaganAdapter, whiteTestAdapter, wooldridgeTestAdapter,
} from '../lib/statistics';

export default function PanelData() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // Results
  const [mainResult, setMainResult] = useState(null);
  const [feResult, setFeResult] = useState(null);
  const [reResult, setReResult] = useState(null);
  const [hausman, setHausman] = useState(null);
  const [diagnostics, setDiagnostics] = useState({});

  const handleUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) return;
        const cols = results.meta.fields || Object.keys(results.data[0]);
        setData(results.data);
        setColumns(cols);
        setFileName(file.name);
        // Reset results
        setMainResult(null);
        setFeResult(null);
        setReResult(null);
        setHausman(null);
        setDiagnostics({});
      },
    });
  }, []);

  const handleEstimate = useCallback(async (cfg) => {
    setConfig(cfg);
    setLoading(true);
    setMainResult(null);
    setFeResult(null);
    setReResult(null);
    setHausman(null);
    setDiagnostics({});

    // Small delay to let UI update
    await new Promise(r => setTimeout(r, 50));

    try {
      const { entityCol, timeCol, yCol, xCols, modelType } = cfg;
      const options = { entityCol, timeCol };

      let result;
      if (modelType === 'pooledOLS') {
        result = pooledOLSAdapter(data, yCol, xCols, options);
      } else if (modelType === 'fixedEffects') {
        result = fixedEffectsAdapter(data, yCol, xCols, options);
      } else if (modelType === 'randomEffects') {
        result = randomEffectsAdapter(data, yCol, xCols, options);
      }

      setMainResult(result);

      // Auto-estimate FE and RE for Hausman comparison
      if (modelType === 'fixedEffects') {
        setFeResult(result);
        try {
          const re = randomEffectsAdapter(data, yCol, xCols, options);
          setReResult(re);
        } catch {}
      } else if (modelType === 'randomEffects') {
        setReResult(result);
        try {
          const fe = fixedEffectsAdapter(data, yCol, xCols, options);
          setFeResult(fe);
        } catch {}
      }
    } catch (err) {
      console.error('[PanelData] estimate error:', err);
    } finally {
      setLoading(false);
    }
  }, [data]);

  const runHausman = useCallback(() => {
    if (!feResult || !reResult) return;
    try {
      const h = hausmanTestAdapter(feResult, reResult);
      setHausman(h);
    } catch (err) {
      console.error('[PanelData] Hausman error:', err);
    }
  }, [feResult, reResult]);

  const runDiagnostic = useCallback((type) => {
    if (!mainResult || !data || !config) return;
    try {
      let result;
      if (type === 'breuschPagan') {
        result = breuschPaganAdapter(mainResult, data, config.xCols);
      } else if (type === 'whiteTest') {
        result = whiteTestAdapter(mainResult, data, config.xCols);
      } else if (type === 'wooldridgeTest') {
        result = wooldridgeTestAdapter(data, config.yCol, config.xCols, config.entityCol, config.timeCol);
      }
      if (result) setDiagnostics(prev => ({ ...prev, [type]: result }));
    } catch (err) {
      console.error(`[PanelData] ${type} error:`, err);
    }
  }, [mainResult, data, config]);

  const clearAll = () => {
    setData(null);
    setColumns([]);
    setFileName('');
    setConfig(null);
    setMainResult(null);
    setFeResult(null);
    setReResult(null);
    setHausman(null);
    setDiagnostics({});
  };

  return (
    <div className="min-h-screen bg-pattern">
      <PageHeader
        title="Analisis Panel Data"
        description="Estimasi model Pooled OLS, Fixed Effects, dan Random Effects dengan diagnostik lengkap."
        icon={<BarChart3 className="w-6 h-6" />}
      />

      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-6">
        {/* Upload */}
        {!data ? (
          <label className="panel p-8 flex flex-col items-center gap-4 cursor-pointer hover:shadow-lg transition-all border-2 border-dashed border-border hover:border-primary/50">
            <Upload className="w-10 h-10 text-muted" />
            <div className="text-center">
              <div className="font-heading font-semibold text-lg">Upload Dataset Panel</div>
              <div className="text-sm text-muted mt-1">CSV dengan kolom entitas, waktu, dan variabel</div>
            </div>
            <input type="file" accept=".csv" onChange={handleUpload} className="hidden" />
          </label>
        ) : (
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-xs text-muted">({data.length} baris, {columns.length} kolom)</span>
              </div>
              <button onClick={clearAll} className="text-sm text-muted hover:text-destructive flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>

            {/* Data preview */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-surface">
                    {columns.map(c => <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {columns.map(c => <td key={c} className="px-3 py-1.5 font-mono">{row[c]?.toString()?.slice(0, 20)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 5 && (
                <div className="text-xs text-muted text-center py-1 bg-surface">
                  ... dan {data.length - 5} baris lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Config */}
        {data && (
          <PanelConfig columns={columns} onEstimate={handleEstimate} loading={loading} />
        )}

        {/* Results */}
        {mainResult && !mainResult.error && (
          <>
            <ModelSummaryCard result={mainResult} modelType={config.modelType} />
            <CoefficientsTable result={mainResult} />

            {/* Hausman Test */}
            {feResult && reResult && (
              <div className="space-y-3">
                {!hausman && (
                  <button
                    onClick={runHausman}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:bg-primary/10 transition-all"
                  >
                    Jalankan Uji Hausman (FE vs RE)
                  </button>
                )}
                {hausman && <HausmanCard result={hausman} />}
              </div>
            )}

            {/* Diagnostics */}
            <div className="panel p-5">
              <h3 className="text-lg font-heading font-semibold mb-3">Diagnostik</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {['breuschPagan', 'whiteTest', 'wooldridgeTest'].map(type => (
                  <button
                    key={type}
                    onClick={() => runDiagnostic(type)}
                    disabled={diagnostics[type]}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:bg-primary/10 disabled:opacity-50 transition-all"
                  >
                    {diagnostics[type] ? '✓ ' : ''}{type === 'breuschPagan' ? 'Breusch-Pagan' : type === 'whiteTest' ? "White's Test" : 'Wooldridge'}
                  </button>
                ))}
              </div>

              {Object.entries(diagnostics).map(([type, result]) => (
                <div key={type} className="mt-3">
                  <DiagnosticsCard type={type} result={result} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Error state */}
        {mainResult?.error && (
          <div className="panel p-5 border border-red-200 bg-red-50 text-red-700">
            <strong>Error:</strong> {mainResult.error}
          </div>
        )}
      </div>
    </div>
  );
}
