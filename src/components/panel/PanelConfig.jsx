import { useState } from 'react';
import { Settings, Play, Loader2 } from 'lucide-react';

export default function PanelConfig({ columns, onEstimate, loading }) {
  const [entityCol, setEntityCol] = useState('');
  const [timeCol, setTimeCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [xCols, setXCols] = useState([]);
  const [modelType, setModelType] = useState('pooledOLS');

  const numericCols = columns.filter(c => c !== entityCol && c !== timeCol);

  const toggleX = (col) => {
    setXCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const canEstimate = entityCol && yCol && xCols.length > 0;

  const handleEstimate = () => {
    if (!canEstimate) return;
    onEstimate({ entityCol, timeCol, yCol, xCols, modelType });
  };

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">Konfigurasi Panel</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Entity column */}
        <div>
          <label className="block text-sm font-medium mb-1">Entitas (ID)</label>
          <select
            value={entityCol}
            onChange={e => setEntityCol(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Pilih kolom...</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Time column */}
        <div>
          <label className="block text-sm font-medium mb-1">Waktu (opsional)</label>
          <select
            value={timeCol}
            onChange={e => setTimeCol(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Pilih kolom...</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Y column */}
        <div>
          <label className="block text-sm font-medium mb-1">Variabel Dependen (Y)</label>
          <select
            value={yCol}
            onChange={e => setYCol(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Pilih kolom...</option>
            {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Model type */}
        <div>
          <label className="block text-sm font-medium mb-1">Tipe Model</label>
          <select
            value={modelType}
            onChange={e => setModelType(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="pooledOLS">Pooled OLS</option>
            <option value="fixedEffects">Fixed Effects (Within)</option>
            <option value="randomEffects">Random Effects (GLS)</option>
          </select>
        </div>
      </div>

      {/* X columns multi-select */}
      <div>
        <label className="block text-sm font-medium mb-2">Variabel Independen (X) — pilih satu atau lebih</label>
        <div className="flex flex-wrap gap-2">
          {numericCols.filter(c => c !== yCol).map(c => (
            <button
              key={c}
              onClick={() => toggleX(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                xCols.includes(c)
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-border text-foreground hover:bg-primary/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate button */}
      <button
        onClick={handleEstimate}
        disabled={!canEstimate || loading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        Estimasi
      </button>
    </div>
  );
}
