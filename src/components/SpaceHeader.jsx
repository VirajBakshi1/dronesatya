import React, { useState, useCallback } from 'react';

const GradientText = ({ text, className }) => {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!isHovering) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setMousePosition({ x });
  }, [isHovering]);

  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, #60A5FA ${mousePosition.x - 50}%, #8B5CF6 ${mousePosition.x + 50}%)`,
    backgroundSize: '100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    textShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
    display: 'inline-block',
    fontWeight: 300,
    transition: 'all 300ms ease-in-out, background-image 0ms'
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="inline-block"
    >
      <h1
        className={`${className}`}
        style={gradientStyle}
      >
        {text}
      </h1>
    </div>
  );
};

const SpaceHeader = () => {
  return (
    <div className="relative py-12 bg-slate-950">
      <div className="flex flex-col items-center">
        <GradientText 
          text="QUICKVERSE" 
          className="text-6xl font-extralight tracking-[0.2em] mb-1"
        />
        <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3" />
        <p className="text-[13px] text-gray-300 tracking-[0.4em] font-normal"
           style={{
             textShadow: '0 0 10px rgba(148, 163, 184, 0.2)',
             letterSpacing: '0.4em'
           }}>
          CONTROL INTERFACE
        </p>
      </div>
    </div>
  );
};

export default SpaceHeader;