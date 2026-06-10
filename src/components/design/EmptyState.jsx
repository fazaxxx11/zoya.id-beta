import React from 'react';

const EmptyState = ({ 
  title, 
  description, 
  action, 
  icon, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-6 text-gray-400">
          <div className="w-12 h-12">
            {icon}
          </div>
        </div>
      )}
      
      {title && (
        <h3 className="font-heading text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;