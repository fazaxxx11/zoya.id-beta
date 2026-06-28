const FlowChart = ({ className }) => {
  const boxStyle = { fill: 'rgb(var(--accent) / 0.08)', stroke: 'rgb(var(--accent))', strokeWidth: 1.5, rx: 8 };

  return (
    <svg
      viewBox="0 0 340 220"
      width="340"
      height="220"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Box: Data Input */}
      <rect x="110" y="10" width="120" height="36" {...boxStyle} />
      <text x="170" y="33" textAnchor="middle" fontSize="12" fill="rgb(var(--fg))" fontWeight="600">
        Data Input
      </text>

      {/* Arrow down */}
      <line x1="170" y1="46" x2="170" y2="74" stroke="rgb(var(--accent))" strokeWidth="1.5" />
      <polygon points="170,80 166,72 174,72" fill="rgb(var(--accent))" />

      {/* Box: Pilih Analisis */}
      <rect x="95" y="80" width="150" height="36" {...boxStyle} />
      <text x="170" y="103" textAnchor="middle" fontSize="12" fill="rgb(var(--fg))" fontWeight="600">
        Pilih Analisis
      </text>

      {/* Arrow to left */}
      <line x1="130" y1="116" x2="60" y2="155" stroke="rgb(var(--accent))" strokeWidth="1.5" />
      <polygon points="55,160 63,158 58,152" fill="rgb(var(--accent))" />

      {/* Arrow to center */}
      <line x1="170" y1="116" x2="170" y2="155" stroke="rgb(var(--accent))" strokeWidth="1.5" />
      <polygon points="170,161 166,153 174,153" fill="rgb(var(--accent))" />

      {/* Arrow to right */}
      <line x1="210" y1="116" x2="280" y2="155" stroke="rgb(var(--accent))" strokeWidth="1.5" />
      <polygon points="285,160 277,158 282,152" fill="rgb(var(--accent))" />

      {/* Box: Deskriptif */}
      <rect x="10" y="160" width="100" height="36" {...boxStyle} />
      <text x="60" y="183" textAnchor="middle" fontSize="12" fill="rgb(var(--fg))" fontWeight="600">
        Deskriptif
      </text>

      {/* Box: Inferensial */}
      <rect x="120" y="160" width="100" height="36" {...boxStyle} />
      <text x="170" y="183" textAnchor="middle" fontSize="12" fill="rgb(var(--fg))" fontWeight="600">
        Inferensial
      </text>

      {/* Box: Regresi */}
      <rect x="230" y="160" width="100" height="36" {...boxStyle} />
      <text x="280" y="183" textAnchor="middle" fontSize="12" fill="rgb(var(--fg))" fontWeight="600">
        Regresi
      </text>
    </svg>
  );
};

export default FlowChart;
