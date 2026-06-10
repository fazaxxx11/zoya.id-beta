import React from 'react';

const Section = ({ 
  title, 
  description, 
  children, 
  className = '', 
  id 
}) => {
  return (
    <div 
      className={`mb-6 ${className}`}
      id={id}
    >
      {title && (
        <h2 className="section-title">
          {title}
        </h2>
      )}
      {description && (
        <p className="section-desc">
          {description}
        </p>
      )}
      {children}
    </div>
  );
};

export default Section;