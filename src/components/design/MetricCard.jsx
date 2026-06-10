import React from 'react';
import Panel from './Panel';

const MetricCard = ({ 
  label, 
  value, 
  helper, 
  className = '', 
  icon 
}) => {
  return (
    <Panel variant="soft" className={`p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="metric-label text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {label}
          </div>
          <div className="metric-value text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {helper && (
            <div 
              className="text-xs mt-2"
              style={{ color: 'rgb(var(--muted))' }}
            >
              {helper}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default MetricCard;