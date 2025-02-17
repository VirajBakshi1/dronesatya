import React from 'react';

const ComponentWrapper = ({ children, className = "" }) => {
  return (
    <div className={`${className} relative group`}>
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-lg transition-all duration-300 backdrop-blur-sm" />
      
      {/* Scale container */}
      <div className="relative transform transition-all duration-300 ease-out group-hover:scale-[1.02] group-hover:-translate-y-1">
        {/* Animated border */}
        <div className="absolute inset-0 rounded-lg border border-gray-800 group-hover:border-blue-500/20 transition-colors duration-300" />
        
        {/* Content */}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ComponentWrapper;