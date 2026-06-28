import React from 'react';
import Panel from './Panel';

const ResultSummary = ({ 
  status = 'info', 
  conclusion, 
  metric, 
  meaning, 
  className = '' 
}) => {
  const statusConfig = {
    pass: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-800',
      borderColor: 'border-emerald-200'
    },
    warn: {
      color: 'bg-amber-500',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200'
    },
    fail: {
      color: 'bg-red-500',
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    },
    info: {
      color: 'bg-blue-500',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200'
    }
  };

  const config = statusConfig[status];

  return (
    <Panel variant="soft" className={`${className}`}>
      <div className="space-y-4">
        {/* Status and Conclusion */}
        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${config.color}`} />
          <div className="flex-1">
            <h3 className={`font-bold text-lg ${config.textColor}`}>
              {conclusion}
            </h3>
          </div>
        </div>

        {/* Primary Metric */}
        <div className="pt-2 border-t border-border">
          <div className="metric-value font-mono text-2xl font-medium text-fg tracking-tight">
            {metric}
          </div>
        </div>

        {/* Meaning Section */}
        <div className="pt-3 border-t border-border">
          <h4 className="font-semibold text-fg/80 mb-2 flex items-center gap-2">
            <span className="text-muted">Apa artinya?</span>
          </h4>
          <p className="text-muted leading-relaxed">
            {meaning}
          </p>
        </div>
      </div>
    </Panel>
  );
};

export default ResultSummary;