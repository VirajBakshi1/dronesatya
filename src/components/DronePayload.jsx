import React, { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import socketManager from '../utils/socketManager';

const DronePayload = () => {
  const [bayStatus, setBayStatus] = useState('UNKNOWN');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data?.teensy) {
        setIsConnected(data.teensy.connected);
      }
    };

    const handleLatchStatus = (data) => {
      if (data?.status) {
        const status = data.status;
        setBayStatus(status);

        // Clear loading state when operation completes
        if (status === 'OPENED' || status === 'CLOSED') {
          setIsLoading(false);
        }
      }
    };

    socketManager.subscribe('telemetry', handleTelemetry);
    socketManager.subscribe('latch_status', handleLatchStatus);

    return () => {
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('latch_status', handleLatchStatus);
    };
  }, []);

  const handleBayDoor = async (command) => {
    if (!isConnected) return;

    setError(null);
    setIsLoading(true);

    try {
      const success = await socketManager.sendCommand('payload_command', {
        command: command
      });

      if (!success) {
        throw new Error('Failed to send command: Not connected');
      }

      // Update status immediately to show operation starting
      setBayStatus(command === 'OPEN' ? 'MOVING_OPEN' : 'MOVING_CLOSE');

    } catch (error) {
      console.error('Failed to send command:', error);
      setError(`Failed to send command: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Status text formatting
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'MOVING_OPEN': return 'Opening Bay...';
      case 'MOVING_CLOSE': return 'Closing Bay...';
      case 'OPENED': return 'Bay Open';
      case 'CLOSED': return 'Bay Closed';
      default: return 'Bay Status Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'MOVING_OPEN':
      case 'MOVING_CLOSE':
        return 'text-yellow-400';
      case 'OPENED':
      case 'CLOSED':
        return 'text-green-400';
      default:
        return 'text-gray-400';
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
                <p className={`mt-2 tracking-wider font-light ${getStatusColor(bayStatus)}`}>
                  {getStatusDisplay(bayStatus)}
                </p>
              </div>
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
                onClick={() => handleBayDoor('CLOSE')}
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
      </div>
    </div>
  );
};

export default DronePayload;