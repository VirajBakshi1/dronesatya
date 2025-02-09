import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../utils/socketManager';

const DroneTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState({
    latitude: 0,
    longitude: 0,
    altitudeMSL: 0,
    altitudeRelative: 0,
    gpsFix: 0,
    satellites: 0
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const telemetryIntervalRef = useRef(null);

  useEffect(() => {
    // Connect to drone
    socketManager.connect();

    // Connection status handler
    const handleConnection = (data) => {
      console.log('Connection status:', data.status);
      setConnected(data.status === 'connected');
      setError('');

      if (data.status === 'connected') {
        // Request initial telemetry data
        socketManager.sendCommand('request_telemetry');

        // Start requesting telemetry data periodically
        telemetryIntervalRef.current = setInterval(() => {
          socketManager.sendCommand('request_telemetry');
        }, 100); // 10Hz update rate
      } else {
        if (telemetryIntervalRef.current) {
          clearInterval(telemetryIntervalRef.current);
        }
      }
    };
    socketManager.subscribe('connection', handleConnection);

    // Error handler
    const handleError = (data) => {
      console.error('Connection error:', data.error);
      setError(`Connection error: ${data.error.message}`);
      setConnected(false);
    };
    socketManager.subscribe('error', handleError);

    // Telemetry data handler
    const handleTelemetry = (data) => {
      if (data) {
        console.log('Received telemetry:', data);
        setTelemetryData(prevData => ({
          ...prevData,
          ...data
        }));
      }
    };
    socketManager.subscribe('telemetry', handleTelemetry);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up telemetry component');
      if (telemetryIntervalRef.current) {
        clearInterval(telemetryIntervalRef.current);
      }
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.unsubscribe('error', handleError);
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.disconnect();
    };
  }, []);

  const formatValue = (value, decimals = 2) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals);
    }
    return '0';
  };

  const getGPSQuality = () => {
    const fix = telemetryData.gpsFix || 0;
    const satellites = telemetryData.satellites || 0;

    if (fix >= 3 && satellites >= 6) return 'Good';
    if (fix >= 2 && satellites >= 4) return 'Moderate';
    return 'Poor';
  };

  const getGPSQualityColor = () => {
    const quality = getGPSQuality();
    switch (quality) {
      case 'Good': return 'bg-green-500';
      case 'Moderate': return 'bg-yellow-500';
      case 'Poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-slate-800 text-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <h1 className="text-xl font-bold">Drone Telemetry</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">GPS Quality:</span>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${getGPSQualityColor()}`}>
                {getGPSQuality()}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          <p className="text-sm text-gray-400 mt-1">
            Status: {connected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Location */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">Location</h2>
            <div className="space-y-1">
              <p className="text-lg font-mono">
                Lat: {formatValue(telemetryData.latitude, 6)}°
              </p>
              <p className="text-lg font-mono">
                Lon: {formatValue(telemetryData.longitude, 6)}°
              </p>
            </div>
          </div>

          {/* Altitude */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h2 className="text-sm text-gray-300 mb-1">Altitude</h2>
            <div className="space-y-1">
              <p className="text-lg font-mono">
                MSL: {formatValue(telemetryData.altitudeMSL)}m
              </p>
              <p className="text-lg font-mono">
                REL: {formatValue(telemetryData.altitudeRelative)}m
              </p>
            </div>
          </div>

          {/* GPS Status */}
          <div className="bg-slate-700 p-4 rounded-lg col-span-2">
            <h2 className="text-sm text-gray-300 mb-1">GPS Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Fix Type</p>
                <p className="text-lg font-mono">{telemetryData.gpsFix}D</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Satellites</p>
                <p className="text-lg font-mono">{telemetryData.satellites}</p>
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
