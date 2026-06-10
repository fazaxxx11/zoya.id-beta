import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  emptyMessage = 'Tidak ada data', 
  className = '',
  compact = false 
}) => {
  const hasData = data && data.length > 0;
  
  const getCellClasses = (column) => {
    const baseClasses = 'px-4 py-3';
    const compactClasses = 'px-3 py-2';
    const alignmentClasses = column.align === 'right' ? 'text-right' : 
                            column.align === 'center' ? 'text-center' : 'text-left';
    const monoClasses = column.mono ? 'font-mono tabular-nums' : '';
    
    return `${compact ? compactClasses : baseClasses} ${alignmentClasses} ${monoClasses}`;
  };

  const getHeaderCellClasses = (column) => {
    const baseClasses = 'px-4 py-3 font-medium';
    const compactClasses = 'px-3 py-2 font-medium';
    const alignmentClasses = column.align === 'right' ? 'text-right' : 
                            column.align === 'center' ? 'text-center' : 'text-left';
    
    return `${compact ? compactClasses : baseClasses} ${alignmentClasses}`;
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: 'rgb(var(--table-head))' }}>
            {columns.map((column) => (
              <th 
                key={column.key}
                className={getHeaderCellClasses(column)}
                style={{ 
                  borderBottom: '1px solid rgb(var(--border))',
                  borderTop: '1px solid rgb(var(--border))'
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasData ? (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                style={{ 
                  borderTop: rowIndex > 0 ? '1px solid rgb(var(--border))' : 'none'
                }}
              >
                {columns.map((column) => (
                  <td 
                    key={`${rowIndex}-${column.key}`}
                    className={getCellClasses(column)}
                    style={{
                      fontFamily: column.mono ? 'var(--mono-font)' : 'inherit',
                      fontVariantNumeric: column.mono ? 'tabular-nums' : 'normal'
                    }}
                  >
                    {row[column.key] || ''}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td 
                colSpan={columns.length}
                className={`text-center ${compact ? 'px-3 py-8' : 'px-4 py-12'}`}
                style={{ 
                  borderTop: '1px solid rgb(var(--border))'
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;