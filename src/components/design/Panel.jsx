import React from 'react';
import clsx from 'clsx';

const Panel = ({ 
  variant = 'default', 
  children, 
  className, 
  id,
  as: Component = 'div',
  ...props 
}) => {
  const variantClasses = {
    default: 'panel',
    soft: 'panel-soft',
    emphasized: 'panel-emphasized'
  };

  return (
    <Component
      id={id}
      className={clsx(variantClasses[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Panel;