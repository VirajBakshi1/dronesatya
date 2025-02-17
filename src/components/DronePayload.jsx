import React, { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import socketManager from '../utils/socketManager';

const DronePayload = () => {
  const [bayStatus, setBayStatus] = useState('UNKNOWN');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);

  useEffect(() => {
    const handleBayConnection = (data) => {
      setIsConnected(data.connected);
    };

    socketManager.subscribe('bay_connection', handleBayConnection);
    
    return () => {
      socketManager.unsubscribe('bay_connection', handleBayConnection);
    };
  }, []);

  const handleBayDoor = async (command) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      await socketManager.emit('payload_command', { command: command });
      setLastCommand(command);
      setBayStatus('COMMAND_SENT');
    } catch (error) {
      console.error('Failed to send command:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBayStatus = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      await socketManager.emit('payload_status_request');
      setBayStatus('CHECKING');
    } catch (error) {
      console.error('Failed to request status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-400" />
              <h1 className="text-xl tracking-wider font-light">PAYLOAD BAY</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-400 tracking-wide">
                BAY {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Status and Warning */}
        <div className="p-6">
          {!isConnected && (
            <div className="mb-4 bg-red-950/30 p-4 rounded-lg border border-red-900">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm tracking-wider font-light">
                  Bay connection lost. Commands disabled.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm text-gray-300 tracking-wider font-light">CURRENT STATUS</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Last Command: {lastCommand || 'No commands sent'}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Status: {bayStatus}
                </p>
              </div>
              <button
                onClick={checkBayStatus}
                disabled={!isConnected || isLoading}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded 
                          text-xs tracking-wider font-light text-blue-400
                          hover:bg-blue-500/30 disabled:opacity-50 
                          disabled:cursor-not-allowed transition-colors"
              >
                CHECK STATUS
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-sm text-gray-300 mb-4 tracking-wider font-light">BAY DOOR CONTROLS</h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleBayDoor('OPEN')}
                disabled={!isConnected || isLoading}
                className="flex-1 py-3 px-6 rounded-lg font-light tracking-wider text-sm
                          bg-slate-700/50 text-white border border-slate-600 
                          hover:bg-slate-700 disabled:opacity-50 
                          disabled:cursor-not-allowed transition-colors"
              >
                OPEN BAY
              </button>
              
              <button
                onClick={() => handleBayDoor('CLOSED')}
                disabled={!isConnected || isLoading}
                className="flex-1 py-3 px-6 rounded-lg font-light tracking-wider text-sm
                          bg-slate-700/50 text-white border border-slate-600 
                          hover:bg-slate-700 disabled:opacity-50 
                          disabled:cursor-not-allowed transition-colors"
              >
                CLOSE BAY
              </button>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="border-t border-gray-800 p-6">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300 tracking-wider font-light">
              DEBUG INFORMATION
            </summary>
            <pre className="mt-4 p-4 bg-slate-950 rounded-lg border border-gray-800 text-xs overflow-auto text-gray-300 font-mono">
              {JSON.stringify({ 
                bayStatus, 
                isLoading, 
                isConnected, 
                lastCommand 
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default DronePayload;