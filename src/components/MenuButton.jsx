// components/MenuButton.jsx
import React from 'react';
import { MoreVertical } from 'lucide-react';

const MenuButton = ({ onClick, isOpen, onMouseEnter }) => {
  return (
    <div 
      className="fixed top-4 right-4 z-50"
      style={{ position: 'fixed' }}
      onMouseEnter={onMouseEnter}
    >
      <button
        onClick={onClick}
        className="p-2 text-white/80 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
      >
        <MoreVertical 
          size={24}
          className={`transform transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
    </div>
  );
};

export default MenuButton;