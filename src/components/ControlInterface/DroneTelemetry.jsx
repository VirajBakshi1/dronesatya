import React, { useState, useEffect } from 'react';
import socketManager from '../../utils/socketManager';

const DroneTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState({
    latitude: 0,
    longitude: 0,
    altitudeMSL: 0,
    altitudeRelative: 0,
    armed: false,
    flight_mode: '',
    connected: false,
    gps_fix: 'NO FIX',
    satellites: 0,
    hdop: 0,
    position_error: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data) {
        console.log('Received telemetry:', data);
        setTelemetryData(prevData => ({
          ...prevData,
          ...data
        }));
      }
    };

    const handleConnection = (data) => {
      setError(null);
      if (data.status === 'connected') {
        console.log('Connected:', socketManager.socket.id);
      } else {
        console.log('Disconnected');
      }
    };

    const handleError = (data) => {
      console.error('Connection error:', data.error);
      setError(`Connection error: ${data.error.message || 'Unknown error'}`);
    };

    socketManager.subscribe('telemetry', handleTelemetry);
    socketManager.subscribe('connection', handleConnection);
    socketManager.subscribe('error', handleError);

    return () => {
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.unsubscribe('error', handleError);
      socketManager.disconnect();
    };
  }, []);

  const formatValue = (value, decimals = 6) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals);
    }
    return '0';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${telemetryData.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <h1 className="text-xl tracking-wider font-light">TELEMETRY</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 tracking-wide">FLIGHT MODE</span>
              <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs tracking-wider font-light text-blue-400">
                {telemetryData.flight_mode || 'UNKNOWN'}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 mt-2 text-sm font-light tracking-wide">{error}</p>}
          <p className="text-sm text-gray-400 mt-2 tracking-wider font-light">
            {telemetryData.connected ? 'SYSTEM CONNECTED' : 'SYSTEM OFFLINE'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Location */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-sm text-gray-300 mb-3 tracking-wider font-light">LOCATION</h2>
            <div className="space-y-2">
              <p className="text-lg font-light tracking-wider text-gray-300">
                LAT: <span className="font-mono text-white">{formatValue(telemetryData.latitude)}°</span>
              </p>
              <p className="text-lg font-light tracking-wider text-gray-300">
                LON: <span className="font-mono text-white">{formatValue(telemetryData.longitude)}°</span>
              </p>
            </div>
          </div>

          {/* Altitude */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-sm text-gray-300 mb-3 tracking-wider font-light">ALTITUDE</h2>
            <div className="space-y-2">
              <p className="text-lg font-light tracking-wider text-gray-300">
                MSL: <span className="font-mono text-white">{formatValue(telemetryData.altitudeMSL, 2)}m</span>
              </p>
              <p className="text-lg font-light tracking-wider text-gray-300">
                REL: <span className="font-mono text-white">{formatValue(telemetryData.altitudeRelative, 2)}m</span>
              </p>
            </div>
          </div>

          {/* GPS Quality - Replaced System Status */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-sm text-gray-300 mb-3 tracking-wider font-light">GPS QUALITY</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 tracking-wider mb-2">HDOP</p>
                <p className="text-lg font-light tracking-wider text-white">
                  {formatValue(telemetryData.hdop, 2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 tracking-wider mb-2">POSITION ERROR</p>
                <p className="text-lg font-light tracking-wider text-white">
                  {formatValue(telemetryData.position_error, 2)}m
                </p>
              </div>
            </div>
          </div>

          {/* GPS Status */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-sm text-gray-300 mb-3 tracking-wider font-light">GPS STATUS</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 tracking-wider mb-2">FIX TYPE</p>
                <p className="text-lg font-light tracking-wider text-white">
                  {telemetryData.gps_fix}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 tracking-wider mb-2">SATELLITES</p>
                <p className="text-lg font-light tracking-wider text-white">
                  {telemetryData.satellites}
                </p>
              </div>
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
              {JSON.stringify(telemetryData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default DroneTelemetry;