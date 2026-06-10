import React, { useState, useEffect, useRef } from 'react';

const DetailsBlock = ({ 
  title, 
  children, 
  defaultOpen = false, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const detailsRef = useRef(null);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = isOpen;
    }
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <details 
      ref={detailsRef}
      className={`details-block ${className}`}
      open={isOpen}
    >
      <summary 
        onClick={(e) => {
          e.preventDefault();
          toggleOpen();
        }}
        className="details-summary"
      >
        <span className="summary-title">{title}</span>
        <svg 
          className={`chevron ${isOpen ? 'open' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none"
          aria-hidden="true"
        >
          <path 
            d="M4 6L8 10L12 6" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="details-content">
        {children}
      </div>
      
      <style jsx>{`
        .details-block {
          display: block;
          width: 100%;
        }
        
        .details-summary {
          cursor: pointer;
          font-family: var(--heading-font);
          font-size: 0.875rem;
          font-weight: 500;
          color: rgb(var(--fg));
          padding: 0.75rem 1rem;
          border: 1px solid rgb(var(--border));
          border-radius: 6px;
          background: rgb(var(--surface));
          display: flex;
          align-items: center;
          justify-content: space-between;
          list-style: none;
          transition: background-color 0.2s ease;
          user-select: none;
        }
        
        .details-summary:hover {
          background: rgba(var(--fg), 0.03);
        }
        
        .details-block[open] .details-summary {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .details-summary::-webkit-details-marker {
          display: none;
        }
        
        .summary-title {
          flex: 1;
        }
        
        .chevron {
          transition: transform 0.2s ease;
          color: rgb(var(--fg-muted));
        }
        
        .chevron.open {
          transform: rotate(180deg);
        }
        
        .details-content {
          padding: 1rem;
          border: 1px solid rgb(var(--border));
          border-top: none;
          border-radius: 0 0 6px 6px;
          background: rgb(var(--card));
        }
      `}</style>
    </details>
  );
};

export default DetailsBlock;