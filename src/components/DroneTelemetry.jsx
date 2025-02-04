import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Replace with your Jetson's IP address
const API_URL = 'http://172.29.172.210:5001'
const SOCKET_URL = 'ws://172.29.172.210:5001'

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
  const socketRef = useRef(null);
  const telemetryIntervalRef = useRef(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    const socket = socketRef.current;

    // Connection handlers
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      setConnected(true);
      setError('');

      // Request initial telemetry data
      socket.emit('request_telemetry');

      // Start requesting telemetry data periodically
      telemetryIntervalRef.current = setInterval(() => {
        socket.emit('request_telemetry');
      }, 100); // 10Hz update rate
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setConnected(false);
      if (telemetryIntervalRef.current) {
        clearInterval(telemetryIntervalRef.current);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(`Socket error: ${err.message}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', () => {
      console.log('Attempting to reconnect...');
    });

    // Telemetry data handler
    socket.on('telemetry', (data) => {
      if (data) {
        console.log('Received telemetry:', data);
        setTelemetryData(prevData => ({
          ...prevData,
          ...data
        }));
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (telemetryIntervalRef.current) {
        clearInterval(telemetryIntervalRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
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
