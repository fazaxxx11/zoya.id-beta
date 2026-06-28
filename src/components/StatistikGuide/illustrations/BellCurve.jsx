const BellCurve = ({ size = 300, className }) => {
  const h = size * 0.5;
  return (
    <svg
      viewBox="0 0 300 150"
      width={size}
      height={h}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bellFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* X-axis */}
      <line x1="20" y1="130" x2="280" y2="130" stroke="rgb(var(--border))" strokeWidth="1" />

      {/* Bell curve */}
      <path
        d="M 20,130 C 40,130 60,128 80,120 C 95,112 105,90 120,60 C 130,40 140,25 150,22 C 160,25 170,40 180,60 C 195,90 205,112 220,120 C 240,128 260,130 280,130"
        fill="url(#bellFill)"
        stroke="rgb(var(--accent))"
        strokeWidth="2"
      />

      {/* Mean / Median / Mode labels */}
      <circle cx="150" cy="22" r="3" fill="rgb(var(--accent))" />
      <text x="150" y="16" textAnchor="middle" fontSize="10" fill="rgb(var(--fg))" fontWeight="600">
        Mean / Median / Mode
      </text>
    </svg>
  );
};

export default BellCurve;
