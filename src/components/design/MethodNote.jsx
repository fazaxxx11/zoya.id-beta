import React from 'react';

const MethodNote = ({ 
  method, 
  threshold, 
  description, 
  limitation, 
  className = '' 
}) => {
  return (
    <div className={`border border-border rounded-md bg-card p-4 ${className}`}>
      <h3 className="section-title text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        Metode
      </h3>

      <div className="space-y-3">
        <div>
          <p className="font-bold text-fg text-base">
            {method}
          </p>
          <p className="text-muted text-sm mt-1">
            Threshold: <span className="font-medium">{threshold}</span>
          </p>
        </div>

        {description && (
          <p className="text-fg/80 text-sm leading-relaxed">
            {description}
          </p>
        )}

        {limitation && (
          <div className="pt-2 border-t border-border">
            <p className="text-fg/80 text-sm">
              <span className="font-medium">Catatan:</span>{' '}
              <span className="text-muted">{limitation}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MethodNote;