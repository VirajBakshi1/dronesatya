import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../utils/socketManager';
import { Search, Pause, Play, XCircle } from 'lucide-react';

const DroneHealth = () => {
  const [mavrosOutput, setMavrosOutput] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    INFO: true,
    WARN: true,
    ERROR: true,
    OTHER: true
  });
  const outputRef = useRef(null);

  useEffect(() => {
    socketManager.connect();

    const handleMavrosOutput = (data) => {
      if (data?.output && !isPaused) {
        setMavrosOutput(prev => {
          const newOutput = [...prev, data.output];
          return newOutput.slice(-1000);
        });
        
        if (outputRef.current && !isPaused) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }
    };

    socketManager.subscribe('mavros_output', handleMavrosOutput);
    
    return () => {
      socketManager.unsubscribe('mavros_output', handleMavrosOutput);
    };
  }, [isPaused]);

  const getMessageType = (message) => {
    if (message.includes('[ERROR]')) return 'ERROR';
    if (message.includes('[WARN]')) return 'WARN';
    if (message.includes('[INFO]')) return 'INFO';
    return 'OTHER';
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-gray-100';
      case 'OTHER': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  const getFilterStyle = (type, isActive) => {
    if (!isActive) return 'bg-slate-800 text-gray-500 border-gray-700';
    
    switch (type) {
      case 'ERROR':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'WARN':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'INFO':
        return 'bg-gray-100/90 text-black border-gray-300/30';
      case 'OTHER':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-800 text-gray-500 border-gray-700';
    }
  };

  const getFilterLabel = (type) => {
    return type === 'OTHER' ? 'SYSTEM' : type;
  };

  const filteredOutput = mavrosOutput.filter(message => {
    const matchesSearch = searchTerm === '' || 
      message.toLowerCase().includes(searchTerm.toLowerCase());
    const type = getMessageType(message);
    return matchesSearch && activeFilters[type];
  });

  const clearOutput = () => {
    setMavrosOutput([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-purple-500' : 'bg-green-500 animate-pulse'}`}></div>
            <h2 className="text-xl tracking-wider font-light">MAVROS MONITOR</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 ${isPaused ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'} rounded-md border tracking-wider`}>
              {isPaused ? 'PAUSED' : 'LIVE OUTPUT'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="px-6 pt-6 flex items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filter Toggles */}
        <div className="flex gap-2">
          {Object.entries(activeFilters).map(([type, isActive]) => (
            <button
              key={type}
              onClick={() => setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }))}
              className={`px-3 py-1 rounded text-xs font-medium tracking-wider transition-all border ${
                getFilterStyle(type, isActive)
              }`}
            >
              {getFilterLabel(type)}
            </button>
          ))}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-lg transition-all ${
              isPaused
                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={clearOutput}
            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="p-6">
        <div
          ref={outputRef}
          className="bg-slate-950 rounded-lg p-6 h-96 w-full overflow-x-auto overflow-y-auto font-mono text-sm whitespace-pre border border-gray-800 relative"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 #1F2937'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #0F172A;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: #1E293B;
              border-radius: 4px;
              border: 1px solid #334155;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #334155;
            }
          `}</style>
          {filteredOutput.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 tracking-wider font-light">
                {mavrosOutput.length === 0 ? 'AWAITING MAVROS DATA...' : 'NO MATCHING MESSAGES'}
              </p>
            </div>
          ) : (
            filteredOutput.map((line, index) => {
              const type = getMessageType(line);
              return (
                <div 
                  key={index} 
                  className={`min-w-max font-light tracking-wide py-0.5 hover:bg-slate-900/50 transition-colors ${getMessageColor(type)}`}
                >
                  <span className="mr-2">→</span>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="px-6 pb-4 flex justify-between items-center text-xs text-gray-400 tracking-wider">
        <p>MAVROS Output Monitor • {filteredOutput.length} / {mavrosOutput.length} messages</p>
        <p>Buffer limit: 1000 lines</p>
      </div>
    </div>
  );
};

export default DroneHealth;