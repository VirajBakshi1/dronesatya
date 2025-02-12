import React, { useState, useEffect } from 'react';
import socketManager from '../utils/socketManager';

const DroneTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState({
    latitude: 0,
    longitude: 0,
    altitudeMSL: 0,
    altitudeRelative: 0,  // Added this line
    armed: false,
    flight_mode: '',
    connected: false,
    gps_fix: 'NO FIX',
    satellites: 0
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
      <div className="bg-slate-800 text-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${telemetryData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <h1 className="text-xl font-bold">Drone Telemetry</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Flight Mode:</span>
              <div className="px-2 py-1 bg-blue-500 rounded text-xs font-semibold">
                {telemetryData.flight_mode || 'UNKNOWN'}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          <p className="text-sm text-gray-400 mt-1">
            Status: {telemetryData.connected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Location */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">Location</h2>
            <div className="space-y-1">
              <p className="text-lg font-mono">
                Lat: {formatValue(telemetryData.latitude)}°
              </p>
              <p className="text-lg font-mono">
                Lon: {formatValue(telemetryData.longitude)}°
              </p>
            </div>
          </div>

          {/* Altitude */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">Altitude</h2>
            <div className="space-y-1">
              <p className="text-lg font-mono">
                MSL: {formatValue(telemetryData.altitudeMSL, 2)}m
              </p>
              <p className="text-lg font-mono">
                REL: {formatValue(telemetryData.altitudeRelative, 2)}m
              </p>
            </div>
          </div>

          {/* Armed Status */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">Drone Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Armed Status</p>
                <p className="text-lg font-mono">
                  {telemetryData.armed ? '🟢 Armed' : '🔴 Disarmed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Connection</p>
                <p className="text-lg font-mono">
                  {telemetryData.connected ? '✅ Connected' : '❌ Disconnected'}
                </p>
              </div>
            </div>
          </div>

          {/* GPS Status */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">GPS Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Fix Type</p>
                <p className="text-lg font-mono">
                  {telemetryData.gps_fix}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Satellites</p>
                <p className="text-lg font-mono">
                  {telemetryData.satellites}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="border-t border-slate-700 p-4">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
              Debug Information
            </summary>
            <pre className="mt-2 p-2 bg-slate-900 rounded text-xs overflow-auto text-gray-300">
              {JSON.stringify(telemetryData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default DroneTelemetry;