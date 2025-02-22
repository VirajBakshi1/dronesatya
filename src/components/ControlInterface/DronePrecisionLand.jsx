import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../../utils/socketManager';

const DronePrecisionLand = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(null);
  const [selectedButton, setSelectedButton] = useState('confirm');
  const modalRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    socketManager.connect();

    const handlePrecisionLandOutput = (data) => {
      if (data?.output) {
        setTerminalOutput(prev => [...prev, data.output]);
        // Auto-scroll to bottom
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }
    };

    const handleCommandResponse = (data) => {
      if (data.command === 'precision_land') {
        if (data.success) {
          setIsRunning(true);
        } else {
          setError(data.message || 'Failed to start precision landing');
          setIsRunning(false);
        }
      } else if (data.command === 'abort_precision_land') {
        if (data.success) {
          setIsRunning(false);
          setTerminalOutput(prev => [...prev, 'Precision landing aborted. Drone in altitude hold mode.']);
        }
      }
    };

    socketManager.subscribe('precision_land_output', handlePrecisionLandOutput);
    socketManager.subscribe('command_response', handleCommandResponse);

    return () => {
      socketManager.unsubscribe('precision_land_output', handlePrecisionLandOutput);
      socketManager.unsubscribe('command_response', handleCommandResponse);
    };
  }, []);

  const handleStart = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setError(null);
    setTerminalOutput([]);

    const success = socketManager.sendCommand('precision_land');
    if (!success) {
      setError('Failed to send command: Not connected');
    }
  };

  const handleAbort = async () => {
    const success = socketManager.sendCommand('abort_precision_land');
    if (!success) {
      setError('Failed to send abort command: Not connected');
    }
  };

  // Handle keyboard navigation in modal
  const handleModalKeyDown = (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      event.preventDefault();
      setSelectedButton(prev => prev === 'confirm' ? 'cancel' : 'confirm');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedButton === 'confirm') {
        handleConfirm();
      }
      setShowConfirmation(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setShowConfirmation(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
      <div className="p-6 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
            <h2 className="text-xl tracking-wider font-light">PRECISION LANDING</h2>
          </div>
          {isRunning && (
            <span className="text-xs px-3 py-1 bg-green-500/20 text-green-300 rounded-md border border-green-500/30 tracking-wider">
              SYSTEM ACTIVE
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 tracking-wider font-light">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Control Buttons */}
          <div className="flex gap-6">
            <button
              onClick={handleStart}
              disabled={isRunning}
              className={`flex-1 py-3 px-6 rounded-lg font-light tracking-wider transition-all ${
                isRunning
                  ? 'bg-slate-800/50 text-gray-500 cursor-not-allowed border border-gray-800'
                  : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
              }`}
            >
              INITIATE LANDING SEQUENCE
            </button>
            <button
              onClick={handleAbort}
              disabled={!isRunning}
              className={`flex-1 py-3 px-6 rounded-lg font-light tracking-wider transition-all ${
                !isRunning
                  ? 'bg-slate-800/50 text-gray-500 cursor-not-allowed border border-gray-800'
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
              }`}
            >
              ABORT SEQUENCE
            </button>
          </div>

          {/* Terminal Output */}
          <div
            ref={outputRef}
            className="bg-slate-950 rounded-lg p-6 h-64 w-full overflow-x-auto overflow-y-auto font-mono text-sm whitespace-pre border border-gray-800"
            style={{
              maxWidth: '100vw',
              scrollbarWidth: 'thin',
              scrollbarColor: '#1E293B #0F172A',
              overflowY: 'auto'
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
            {terminalOutput.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 tracking-wider font-light">
                  AWAITING LANDING SEQUENCE...
                </p>
              </div>
            ) : (
              terminalOutput.map((line, index) => (
                <div key={index} className="text-gray-300 min-w-max font-light tracking-wide">
                  <span className="text-blue-400 mr-2">→</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            onKeyDown={handleModalKeyDown}
            tabIndex={0}
            ref={modalRef}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="bg-slate-900 p-8 rounded-lg shadow-lg z-10 max-w-md w-full border border-gray-800">
              <h3 className="text-xl font-light tracking-wider mb-4">CONFIRM LANDING SEQUENCE</h3>
              <p className="mb-6 text-gray-300 tracking-wide">
                Initiating precision landing sequence. Confirm landing target is properly configured.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className={`px-6 py-3 rounded-lg tracking-wider font-light
                    ${selectedButton === 'cancel' 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30 ring-2 ring-red-500/50' 
                      : 'bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20'}`}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-3 rounded-lg tracking-wider font-light
                    ${selectedButton === 'confirm' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30 ring-2 ring-green-500/50' 
                      : 'bg-green-500/10 text-green-300 border border-green-500/20 hover:bg-green-500/20'}`}
                >
                  CONFIRM
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500 tracking-wider">
                Use Arrow Keys to navigate • Enter to confirm • ESC to cancel
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="px-6 pb-4 text-xs text-gray-400 tracking-wider">
        <p>PRECISION LANDING SYSTEM • {terminalOutput.length} operations logged</p>
      </div>
    </div>
  );
};

export default DronePrecisionLand;