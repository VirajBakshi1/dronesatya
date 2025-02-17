import React, { useState, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const GradientText = ({ text, className }) => {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!isHovering) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setMousePosition({ x });
  }, [isHovering]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="inline-block"
    >
      <h1
        className={`${className}`}
        style={{
          backgroundImage: isHovering
            ? `linear-gradient(90deg, #60A5FA ${mousePosition.x - 50}%, #8B5CF6 ${mousePosition.x + 50}%)`
            : 'none',
          backgroundSize: '100%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: isHovering ? 'transparent' : 'white',
          color: isHovering ? 'transparent' : 'white',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
          display: 'inline-block',
          fontWeight: 300,
          transition: 'all 300ms ease-in-out, background-image 0ms'
        }}
      >
        {text}
      </h1>
    </div>
  );
};

const GradientButton = ({ text, isLoading, disabled, onClick }) => {
  const [mousePosition, setMousePosition] = useState({ x: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!isHovering || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setMousePosition({ x });
  }, [isHovering, disabled]);

  return (
    <button
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-md font-light tracking-wider text-white transition-all duration-300 relative overflow-hidden"
      style={{
        background: isHovering && !disabled
          ? `linear-gradient(90deg, #60A5FA ${mousePosition.x - 50}%, #8B5CF6 ${mousePosition.x + 50}%)`
          : 'linear-gradient(90deg, #60A5FA, #8B5CF6)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {text}
    </button>
  );
};

const AuthPage = ({ onAuthenticated, children }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);

  useEffect(() => {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      const lastAuthTime = localStorage.getItem('lastAuthTime');
      const currentTime = new Date().getTime();
      
      // If no previous auth or it's been more than 1 hour since last auth
      if (!lastAuthTime || (currentTime - parseInt(lastAuthTime)) > (60 * 60 * 1000)) {
        setRequireAuth(true);
        return;
      }
    }

    // Get the load count from localStorage
    const loadCount = parseInt(localStorage.getItem('loadCount') || '0');
    
    // Increment the count
    const newCount = loadCount + 1;
    localStorage.setItem('loadCount', newCount.toString());

    // Check if authentication is required
    if (newCount >= 10) {
      setRequireAuth(true);
      // Reset the counter
      localStorage.setItem('loadCount', '0');
    }
  }, []);

  const handleLogoClick = () => {
    if (requireAuth) {
      setShowAuth(true);
    } else {
      onAuthenticated(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (password === 'demo123') {
        // Store authentication time
        localStorage.setItem('lastAuthTime', new Date().getTime().toString());
        onAuthenticated(true);
      } else {
        setError('Invalid authentication credentials');
        setPassword('');
      }
      setIsLoading(false);
    }, 1500);
  };

  // Add escape key handler
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && showAuth) {
        setShowAuth(false);
        setPassword('');
        setError('');
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showAuth]);

  return (
    <div className="relative min-h-screen">
      <div className="filter blur-sm">
        {children}
      </div>

      <div className={`fixed inset-0 transition-all duration-1000 ${showAuth ? 'bg-slate-950/60' : 'bg-black'} flex items-center justify-center`}>
        <div className={`transition-all duration-1000 ease-in-out ${showAuth ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
          <button
            onClick={handleLogoClick}
            className="focus:outline-none group"
            disabled={showAuth}
          >
            <GradientText 
              text="QUICKVERSE" 
              className="text-8xl tracking-[0.4em]"
            />
            
            <div className="h-[1px] w-96 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent my-3 transition-all duration-500 group-hover:w-full" />
            <p className="text-sm text-gray-400 tracking-[0.4em] font-extralight text-center"
               style={{
                 textShadow: '0 0 10px rgba(148, 163, 184, 0.2)',
                 letterSpacing: '0.4em'
               }}>
              CONTROL INTERFACE
            </p>
          </button>
        </div>

        <div 
          className={`absolute transition-all duration-1000 ease-out transform
            ${showAuth ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}
        >
          <form onSubmit={handleSubmit} className="w-96">
            <div className="bg-slate-900 backdrop-blur-xl p-8 rounded-lg border border-gray-800/50 shadow-2xl">
              <h2 className="text-2xl font-light tracking-[0.2em] text-white mb-8 text-center">
                AUTHENTICATION
              </h2>
              
              <div className="space-y-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Access Code"
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-md border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none tracking-widest placeholder:text-gray-500"
                  autoFocus
                />

                {error && (
                  <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm border border-red-500/20 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
                    <p className="text-sm font-light tracking-wider text-red-400/90">
                      {error}
                    </p>
                  </div>
                )}

                {isLoading ? (
                  <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-md font-light tracking-wider text-center">
                    <div className="flex gap-1 justify-center">
                      <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse" style={{ animationDuration: '1s' }} />
                      <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
                    </div>
                  </div>
                ) : (
                  <GradientButton 
                    text="ACCESS SYSTEM"
                    disabled={!password}
                    onClick={handleSubmit}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;