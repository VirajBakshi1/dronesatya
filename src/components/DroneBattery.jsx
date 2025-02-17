import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Battery, Zap, AlertTriangle, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import socketManager from '../utils/socketManager';

const DroneBattery = () => {
  // Core state
  const [voltage, setVoltage] = useState(16.8);
  const [current, setCurrent] = useState(0);
  const [showPowerGraph, setShowPowerGraph] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [showAllTime, setShowAllTime] = useState(false);
  const [windowSize, setWindowSize] = useState(() => {
    const saved = localStorage.getItem('graphWindowSize');
    return saved ? parseInt(saved) : 30;
  });
  
  // Persistent data state
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    const saved = localStorage.getItem('droneHistory');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Constants
  const MAX_VOLTAGE = 16.8;
  const MIN_VOLTAGE = 14.8;
  const WARNING_VOLTAGE = 15.0;
  const CRITICAL_PERCENTAGE = 15;
  const MAX_CURRENT = 60;
  
  // Derived calculations
  const instantPower = voltage * current;
  const batteryPercentage = ((voltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100;
  const isLowVoltage = voltage <= WARNING_VOLTAGE;
  const isCriticalPercentage = batteryPercentage <= CRITICAL_PERCENTAGE;
  const totalPowerDraw = telemetryHistory.reduce((acc, point) => acc + (point.power * (1/36000)), 0);

  // Save to localStorage whenever history updates
  useEffect(() => {
    localStorage.setItem('droneHistory', JSON.stringify(telemetryHistory));
  }, [telemetryHistory]);

  // Save window size to localStorage
  useEffect(() => {
    localStorage.setItem('graphWindowSize', windowSize.toString());
  }, [windowSize]);

  // Update telemetry data
  const updateTelemetry = useCallback((v, c) => {
    const now = Date.now();
    const newPoint = {
      time: new Date().toLocaleTimeString(),
      timestamp: now,
      voltage: v,
      current: c,
      power: v * c
    };
    
    setTelemetryHistory(prev => [...prev, newPoint]);
    setLastUpdateTime(now);
  }, []);

  // Handle telemetry updates
  useEffect(() => {
    const handleTelemetry = (data) => {
      if (data.voltage !== undefined) setVoltage(data.voltage);
      if (data.current !== undefined) setCurrent(data.current);
    };

    socketManager.subscribe('telemetry', handleTelemetry);
    return () => socketManager.unsubscribe('telemetry', handleTelemetry);
  }, []);

  // Update history when voltage or current change
  useEffect(() => {
    updateTelemetry(voltage, current);
  }, [voltage, current, updateTelemetry]);

  const clearHistory = () => {
    setTelemetryHistory([]);
    localStorage.removeItem('droneHistory');
  };

  // Get data based on view mode
  const displayData = showAllTime ? telemetryHistory : telemetryHistory.slice(-windowSize);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
          <p className="text-white">{payload[0].payload.time}</p>
          <p className="text-blue-400">Voltage: {payload[0].payload.voltage.toFixed(2)}V</p>
          <p className="text-yellow-400">Current: {payload[0].payload.current.toFixed(1)}A</p>
          <p className="text-green-400">Power: {payload[0].payload.power.toFixed(1)}W</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-2xl tracking-wider font-light">BATTERY STATUS</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              {!showAllTime && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 tracking-wider">WINDOW:</span>
                  <select
                    value={windowSize}
                    onChange={(e) => setWindowSize(Number(e.target.value))}
                    className="bg-slate-800/70 text-white px-3 py-1 rounded-md border border-gray-800"
                  >
                    <option value="10">10 points (1s)</option>
                    <option value="30">30 points (3s)</option>
                    <option value="60">60 points (6s)</option>
                    <option value="120">120 points (12s)</option>
                    <option value="300">300 points (30s)</option>
                  </select>
                </div>
              )}
              <button
                onClick={() => setShowAllTime(!showAllTime)}
                className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30"
              >
                {showAllTime ? 'Show Real-time' : 'Show All-time'}
              </button>
            </div>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
            >
              <Trash2 size={16} />
              Clear History
            </button>
            <div className="flex items-center space-x-4">
              <Clock className="text-blue-400 h-5 w-5" />
              <span className="text-blue-400 tracking-wider">{new Date(lastUpdateTime).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-6 px-6">
        <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 text-blue-400 mb-3">
            <Battery />
            <span className="text-sm tracking-wider">VOLTAGE</span>
          </div>
          <div className="text-2xl font-light tracking-wider">{voltage.toFixed(2)}V</div>
          <div className="text-sm text-gray-400 tracking-wider mt-2">Range: {MIN_VOLTAGE}V - {MAX_VOLTAGE}V</div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 text-yellow-400 mb-3">
            <Zap />
            <span className="text-sm tracking-wider">CURRENT DRAW</span>
          </div>
          <div className="text-2xl font-light tracking-wider">{current.toFixed(1)}A</div>
          <div className="text-sm text-gray-400 tracking-wider mt-2">Power: {instantPower.toFixed(1)}W</div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 text-green-400 mb-3">
            <Battery className={batteryPercentage <= 20 ? 'animate-pulse text-red-400' : ''} />
            <span className="text-sm tracking-wider">BATTERY STATUS</span>
          </div>
          <div className="text-2xl font-light tracking-wider">{Math.max(0, Math.min(100, batteryPercentage)).toFixed(1)}%</div>
          <div className="text-sm text-gray-400 tracking-wider mt-2">
            Total: {totalPowerDraw.toFixed(2)} Wh
          </div>
        </div>
      </div>

      {/* Main Graph - Enhanced styling */}
      <div className="bg-slate-800/50 mx-6 p-6 rounded-lg border border-gray-800">
        <h3 className="text-lg font-light tracking-wider mb-4">VOLTAGE & CURRENT HISTORY</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                yAxisId="current"
                domain={[0, MAX_CURRENT]}
                stroke="#EAB308"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Current (A)', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: '#9CA3AF'
                }}
              />
              <YAxis 
                yAxisId="voltage"
                orientation="right"
                domain={[14, 17]}
                stroke="#3B82F6"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Voltage (V)', 
                  angle: 90, 
                  position: 'insideRight',
                  fill: '#9CA3AF'
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                yAxisId="current"
                type="monotone" 
                dataKey="current" 
                stroke="#EAB308" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                yAxisId="voltage"
                type="monotone" 
                dataKey="voltage" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Power Graph Toggle - Enhanced */}
      <div className="mx-6">
        <button
          onClick={() => setShowPowerGraph(prev => !prev)}
          className="w-full py-2 px-4 rounded-md bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center gap-2 border border-gray-800 tracking-wider"
        >
          {showPowerGraph ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          {showPowerGraph ? 'HIDE POWER GRAPH' : 'SHOW POWER GRAPH'}
        </button>
      </div>

      {/* Collapsible Power Graph - Enhanced */}
      {showPowerGraph && (
        <div className="bg-slate-800/50 mx-6 p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-light tracking-wider mb-4">POWER CONSUMPTION HISTORY</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#10B981"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ 
                    value: 'Power (W)', 
                    angle: -90, 
                    position: 'insideLeft',
                    fill: '#9CA3AF'
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Warning Indicator - Enhanced */}
      {(isLowVoltage || isCriticalPercentage) && (
        <div className="mx-6 p-6 rounded-lg border border-red-500 bg-red-500/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="bg-red-500/20 rounded-full p-2 border border-red-500/30">
              <AlertTriangle className="animate-pulse text-red-400" size={24} />
            </div>
            <div>
              <h4 className="text-red-200 font-light text-lg tracking-wider">
                {isCriticalPercentage ? 'CRITICAL BATTERY LEVEL' : 'LOW BATTERY WARNING'}
              </h4>
              <p className="text-red-200 tracking-wider mt-1">
                {isCriticalPercentage 
                  ? `Battery at ${batteryPercentage.toFixed(1)}% - Land immediately!`
                  : `Battery voltage at ${voltage.toFixed(1)}V - Prepare to land`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Message - Enhanced */}
      <div className="text-sm text-gray-400 p-6 tracking-wider">
        <p>STATUS: {isCriticalPercentage ? 'CRITICAL' : isLowVoltage ? 'WARNING' : 'NORMAL'}</p>
        <p>LAST UPDATED: {new Date(lastUpdateTime).toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default DroneBattery;