const SkewnessChart = ({ className }) => {
  return (
    <svg
      viewBox="0 0 360 120"
      width="360"
      height="120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Normal — symmetric */}
      <g>
        <path
          d="M 10,90 C 25,90 35,88 45,80 C 55,65 60,40 70,25 C 75,20 80,20 85,25 C 95,40 100,65 110,80 C 120,88 130,90 145,90"
          fill="#dbeafe"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
        <text x="77" y="108" textAnchor="middle" fontSize="10" fill="#3b82f6" fontWeight="600">
          Normal
        </text>
      </g>

      {/* Left-Skewed — long tail to the left */}
      <g>
        <path
          d="M 130,90 C 140,88 148,82 155,72 C 162,60 170,35 180,22 C 185,18 190,18 195,22 C 202,30 208,50 215,68 C 222,80 230,88 240,90"
          fill="#ede9fe"
          stroke="#7c3aed"
          strokeWidth="1.5"
        />
        <text x="185" y="108" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="600">
          Left-Skewed
        </text>
      </g>

      {/* Right-Skewed — long tail to the right */}
      <g>
        <path
          d="M 230,90 C 240,88 248,82 255,72 C 262,60 268,35 275,22 C 280,18 285,18 290,22 C 298,30 305,50 315,68 C 325,82 335,88 350,90"
          fill="#dcfce7"
          stroke="#16a34a"
          strokeWidth="1.5"
        />
        <text x="290" y="108" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">
          Right-Skewed
        </text>
      </g>
    </svg>
  );
};

export default SkewnessChart;
