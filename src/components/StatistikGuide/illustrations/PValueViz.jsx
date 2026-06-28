const PValueViz = ({ alpha = 0.05, className }) => {
  const leftX = 72;
  const rightX = 228;
  return (
    <svg
      viewBox="0 0 300 150"
      width="300"
      height="150"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bell curve */}
      <path
        d="M 15,125 C 30,125 50,122 70,115 C 85,108 100,85 115,60 C 125,42 135,28 150,24 C 165,28 175,42 185,60 C 200,85 215,108 230,115 C 250,122 270,125 285,125"
        fill="rgb(var(--accent) / 0.08)"
        stroke="rgb(var(--accent))"
        strokeWidth="2"
      />

      {/* Left reject region fill */}
      <path
        d="M 15,125 C 25,125 35,124 45,122 C 55,118 65,110 72,100 L 72,125 Z"
        fill="rgb(var(--warm-rose) / 0.25)"
      />

      {/* Right reject region fill */}
      <path
        d="M 285,125 C 275,125 265,124 255,122 C 245,118 235,110 228,100 L 228,125 Z"
        fill="rgb(var(--warm-rose) / 0.25)"
      />

      {/* Dashed threshold lines */}
      <line x1={leftX} y1="20" x2={leftX} y2="125" stroke="rgb(var(--warm-rose))" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={rightX} y1="20" x2={rightX} y2="125" stroke="rgb(var(--warm-rose))" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* p-value labels on threshold lines */}
      <text x={leftX} y="16" textAnchor="middle" fontSize="9" fill="rgb(var(--warm-rose))" fontWeight="600">
        p = {alpha}
      </text>
      <text x={rightX} y="16" textAnchor="middle" fontSize="9" fill="rgb(var(--warm-rose))" fontWeight="600">
        p = {alpha}
      </text>

      {/* Reject Region labels */}
      <text x="38" y="75" textAnchor="middle" fontSize="8" fill="rgb(var(--warm-rose))" fontWeight="500">
        Reject
      </text>
      <text x="38" y="85" textAnchor="middle" fontSize="8" fill="rgb(var(--warm-rose))" fontWeight="500">
        Region
      </text>
      <text x="262" y="75" textAnchor="middle" fontSize="8" fill="rgb(var(--warm-rose))" fontWeight="500">
        Reject
      </text>
      <text x="262" y="85" textAnchor="middle" fontSize="8" fill="rgb(var(--warm-rose))" fontWeight="500">
        Region
      </text>

      {/* Fail to Reject label */}
      <text x="150" y="110" textAnchor="middle" fontSize="9" fill="rgb(var(--fg))" fontWeight="600">
        Fail to Reject H₀
      </text>
    </svg>
  );
};

export default PValueViz;
