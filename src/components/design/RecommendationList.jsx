import React from 'react';

const RecommendationList = ({ 
  items = [], 
  title = "Rekomendasi",
  className = "" 
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={`${className}`}>
      <h2 className="section-title">{title}</h2>
      <ol className="list-none pl-0 mt-4">
        {items.map((item, index) => (
          <li key={index} className="flex mb-2 last:mb-0">
            <div className="flex-shrink-0 mr-3">
              <span 
                className="font-mono font-medium text-sm"
                style={{ 
                  fontFamily: 'var(--mono-font, monospace)',
                  color: 'var(--accent, #2563eb)'
                }}
              >
                {index + 1}.
              </span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {item}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default RecommendationList;