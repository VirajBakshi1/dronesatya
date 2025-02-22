// App.jsx
import React, { useState, useEffect } from 'react';
import "@cesium/widgets/Source/widgets.css";

import ControlInterface from './pages/ControlInterface';
import PlanningInterface from './pages/PlanningInterface';
import PerceptionInterface from './pages/PerceptionInterface';
import MenuButton from './components/MenuButton';
import MenuOverlay from './components/MenuOverlay';
import AuthPage from './components/AuthPage';

// Ion access token setup
import { Ion } from 'cesium';
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNzczMDI0Ni1hYWIzLTQ3NWItYTdiNy1jYzk0N2MyMzllM2UiLCJpZCI6Mjc3OTkyLCJpYXQiOjE3NDAxMzQxNDd9.jqgPDpM7pZYgWZoJuUAEqaGAhVHMEmC0CQdJpZWySBo';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('control');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleMouseEnter = () => {
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleNavigate = (page) => {
    setIsMenuOpen(false);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 300);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'planning':
        return <PlanningInterface onOpenMenu={toggleMenu} />;
      case 'perception':
        return <PerceptionInterface onOpenMenu={toggleMenu} />;
      default:
        return <ControlInterface onOpenMenu={toggleMenu} />;
    }
  };

  const menuComponents = (
    <>
      <MenuButton
        onClick={toggleMenu}
        onMouseEnter={handleMouseEnter}
        isOpen={isMenuOpen}
      />
      <MenuOverlay
        isOpen={isMenuOpen}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onMouseLeave={handleMouseLeave}
      />
    </>
  );

  const content = (
    <div className="min-h-screen bg-slate-950">
      <div className="scroll-container h-screen overflow-auto">
        <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {renderPage()}
        </div>
      </div>
      {menuComponents}

      {/* Cesium Global Styles */}
      <style jsx global>{`
        // Force Cesium widget to use dark theme
        .cesium-widget {
          background-color: #020617 !important;
        }

        .cesium-widget canvas {
          background-color: #020617 !important;
        }

        // Hide default Cesium credits
        .cesium-viewer-bottom {
          display: none !important;
        }

        // Style Cesium controls
        .cesium-viewer-toolbar {
          background: rgba(2, 6, 23, 0.8) !important;
          border-radius: 0.5rem;
          padding: 4px;
        }

        .cesium-button {
          background-color: rgba(30, 41, 59, 0.8) !important;
          border: 1px solid rgba(51, 65, 85, 0.5) !important;
          border-radius: 0.375rem !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .cesium-button:hover {
          background-color: rgba(51, 65, 85, 0.8) !important;
          color: white !important;
        }

        // Make container match theme
        .cesium-viewer {
          background-color: #020617 !important;
          border-radius: 0.5rem;
          overflow: hidden;
        }
      `}</style>
    </div>
  );

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={setIsAuthenticated}>{content}</AuthPage>;
  }

  return content;
};

export default App;