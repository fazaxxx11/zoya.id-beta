const ScatterLine = ({ className }) => {
  const data = [
    { x: 1, y: 2 },
    { x: 2, y: 3.5 },
    { x: 3, y: 2.8 },
    { x: 4, y: 5 },
    { x: 5, y: 4.2 },
    { x: 6, y: 6 },
    { x: 7, y: 5.8 },
    { x: 8, y: 7.5 },
    { x: 9, y: 7 },
    { x: 10, y: 9 },
  ];

  const toSvgX = (x) => 40 + (x - 1) * 24;
  const toSvgY = (y) => 170 - y * 17;

  return (
    <svg
      viewBox="0 0 300 200"
      width="300"
      height="200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Axes */}
      <line x1="35" y1="170" x2="285" y2="170" stroke="rgb(var(--border))" strokeWidth="1" />
      <line x1="40" y1="10" x2="40" y2="175" stroke="rgb(var(--border))" strokeWidth="1" />

      {/* X-axis tick labels */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
        <text key={v} x={toSvgX(v)} y="185" textAnchor="middle" fontSize="8" fill="rgb(var(--muted))">
          {v}
        </text>
      ))}

      {/* Y-axis tick labels */}
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <text key={v} x="30" y={toSvgY(v) + 3} textAnchor="end" fontSize="8" fill="rgb(var(--muted))">
          {v}
        </text>
      ))}

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={toSvgX(d.x)} cy={toSvgY(d.y)} r="4" fill="rgb(var(--accent))" />
      ))}

      {/* Regression line: (1, 2.1) → (10, 8.9) */}
      <line
        x1={toSvgX(1)}
        y1={toSvgY(2.1)}
        x2={toSvgX(10)}
        y2={toSvgY(8.9)}
        stroke="rgb(var(--warm-rose))"
        strokeWidth="2"
      />

      {/* Beta label */}
      <text x={toSvgX(7)} y={toSvgY(6.5) - 8} fontSize="10" fill="rgb(var(--warm-rose))" fontWeight="600">
        β = 0.75
      </text>

      {/* R² label */}
      <text x="260" y="22" textAnchor="end" fontSize="10" fill="rgb(var(--fg))" fontWeight="600">
        R² = 0.94
      </text>
    </svg>
  );
};

export default ScatterLine;
