// App.jsx
import React, { useState, useEffect } from 'react';
import ControlInterface from './pages/ControlInterface';
import PlanningInterface from './pages/PlanningInterface';
import PerceptionInterface from './pages/PerceptionInterface';
import MenuButton from './components/MenuButton';
import MenuOverlay from './components/MenuOverlay';
import AuthPage from './components/AuthPage';

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
        return <PlanningInterface />;
      case 'perception':
        return <PerceptionInterface />;
      default:
        return <ControlInterface />;
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
    </div>
  );

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={setIsAuthenticated}>{content}</AuthPage>;
  }

  return content;
};

export default App;