// components/MenuOverlay.jsx
import React from 'react';

const MenuOverlay = ({ isOpen, onNavigate, currentPage, onMouseLeave }) => {
  return (
    <div 
      className="fixed top-0 right-0 z-40"
      onMouseLeave={onMouseLeave}
    >
      {/* Enhanced dark gradient overlay */}
      <div 
        className={`
          fixed top-0 right-0 
          w-[600px] h-[600px] 
          transition-all duration-300 ease-out
          pointer-events-none
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: `
            radial-gradient(
              circle at top right,
              rgba(0, 0, 0, 0.95) 0%,
              rgba(0, 0, 0, 0.8) 20%,
              rgba(0, 0, 0, 0.6) 40%,
              transparent 75%
            )
          `
        }}
      />

      {/* Menu container */}
      <div 
        className={`
          fixed top-16 right-4
          transition-all duration-300 ease-out
          ${isOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-2 pointer-events-none'
          }
        `}
      >
        <div className="relative p-[1px] rounded-lg bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-transparent">
          <div className="relative bg-slate-900/90 backdrop-blur-md rounded-lg overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            
            <div className="p-1">
              {currentPage !== 'control' && (
                <button
                  onClick={() => onNavigate('control')}
                  className="relative w-full px-6 py-3 text-left group rounded-t-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 rounded-md" />
                  <span className="relative text-gray-300 group-hover:text-white transition-colors">
                    Control Interface
                  </span>
                </button>
              )}
              {currentPage !== 'planning' && (
                <button
                  onClick={() => onNavigate('planning')}
                  className="relative w-full px-6 py-3 text-left group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 rounded-md" />
                  <span className="relative text-gray-300 group-hover:text-white transition-colors">
                    Planning Interface
                  </span>
                </button>
              )}
              {currentPage !== 'perception' && (
                <button
                  onClick={() => onNavigate('perception')}
                  className="relative w-full px-6 py-3 text-left group rounded-b-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 rounded-md" />
                  <span className="relative text-gray-300 group-hover:text-white transition-colors">
                    Perception Interface
                  </span>
                </button>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuOverlay;