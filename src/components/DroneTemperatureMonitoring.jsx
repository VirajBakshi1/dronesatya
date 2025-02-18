import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Clock, ChevronDown, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import socketManager from "../utils/socketManager";

const CustomAlert = ({ type, title, description }) => {
  const bgColor = type === 'warning' ? 'bg-yellow-900/50 border-yellow-400/30' : 'bg-red-900/50 border-red-400/30';
  const textColor = type === 'warning' ? 'text-yellow-400' : 'text-red-400';
  const descriptionColor = type === 'warning' ? 'text-yellow-100' : 'text-red-100';

  return (
    <div className={`rounded-lg border ${bgColor} p-6 mb-4 backdrop-blur-sm`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className={`h-5 w-5 ${textColor} animate-pulse`} />
        <div>
          <h4 className={`font-light tracking-wider ${textColor}`}>{title}</h4>
          <p className={`${descriptionColor} tracking-wide mt-1 font-light`}>{description}</p>
        </div>
      </div>
    </div>
  );
};

const DroneTemperatureMonitoring = () => {
  // Core state with min/max tracking
  const [temperatures, setTemperatures] = useState([
    { id: 1, name: 'Front Left ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity },
    { id: 2, name: 'Front Right ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity },
    { id: 3, name: 'Mid Left ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity },
    { id: 4, name: 'Mid Right ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity },
    { id: 5, name: 'Rear Left ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity },
    { id: 6, name: 'Rear Right ESC', temp: 0, currentDraw: 0, minTemp: Infinity, maxTemp: -Infinity }
  ]);

  const [windowSize, setWindowSize] = useState(() => {
    const saved = localStorage.getItem('tempGraphWindowSize');
    return saved ? parseInt(saved) : 30;
  });
  const [showAllTime, setShowAllTime] = useState(false);

  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    const saved = localStorage.getItem('escTempHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever history updates
  useEffect(() => {
    localStorage.setItem('escTempHistory', JSON.stringify(telemetryHistory));
  }, [telemetryHistory]);

  // Save window size to localStorage
  useEffect(() => {
    localStorage.setItem('tempGraphWindowSize', windowSize.toString());
  }, [windowSize]);

  // Update telemetry when new data arrives
  const updateTelemetry = useCallback((newTemps) => {
    const now = Date.now();
    const newPoint = {
      time: new Date().toLocaleTimeString(),
      timestamp: now,
      ...newTemps.reduce((acc, esc) => ({
        ...acc,
        [esc.name]: esc.temp
      }), {})
    };

    setTelemetryHistory(prev => {
      const newHistory = [...prev, newPoint];
      return newHistory.slice(-windowSize);
    });
  }, [windowSize]);

  // Handle incoming socket data with min/max tracking
  useEffect(() => {
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data?.teensy) {
        // Update temperatures and current draw
        const temps = data.teensy.temperatures || [];
        const currents = data.teensy.current_draw || [];

        setTemperatures(prev => prev.map((esc, index) => {
          const newTemp = temps[index] || 0;
          const newCurrentDraw = currents[index] || 0;
          return {
            ...esc,
            temp: newTemp,
            currentDraw: newCurrentDraw,
            minTemp: Math.min(esc.minTemp === Infinity ? newTemp : esc.minTemp, newTemp ),
            maxTemp: Math.max(esc.maxTemp === -Infinity ? newTemp : esc.maxTemp, newTemp )
          };
        }));
        updateTelemetry(
          temperatures.map((esc, index) => ({
            name: esc.name,
            temp: data?.teensy?.temperatures?.[index] || 0
          }))
        );
      }
    };

    socketManager.subscribe('telemetry', handleTelemetry);
    return () => socketManager.unsubscribe('telemetry', handleTelemetry);
  }, [updateTelemetry, temperatures]); // Removed direct dependency on `temperatures` from useCallback and added to useEffect


  const clearHistory = () => {
    setTelemetryHistory([]);
    localStorage.removeItem('escTempHistory');
    // Reset min/max temps
    setTemperatures(prev => prev.map(esc => ({
      ...esc,
      minTemp: Infinity,
      maxTemp: -Infinity
    })));
  };

  // Get data based on view mode
  const displayData = showAllTime ? telemetryHistory : telemetryHistory.slice(-windowSize);

  const getTemperatureColor = (temp) => {
    if (temp >= 100) return 'bg-red-500';
    if (temp >= 80) return 'bg-red-400';
    if (temp >= 60) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getTemperatureTextColor = (temp) => {
    if (temp >= 100) return 'text-red-500';
    if (temp >= 80) return 'text-red-400';
    if (temp >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getLoadPercentage = (currentDraw) => {
    return (currentDraw / 40) * 100; // Based on 40A ESC
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
          <p className="text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.stroke }}>
              {entry.name}: {entry.value.toFixed(1)}°C
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 rounded-lg p-6 shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h2 className="text-white text-xl tracking-wider font-light">ESC TEMPERATURE MONITOR</h2>
        </div>
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
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 tracking-wider"
            >
              {showAllTime ? 'Show Real-time' : 'Show All-time'}
            </button>
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 tracking-wider"
          >
            <Trash2 size={16} />
            Clear History
          </button>
          <div className="flex items-center space-x-4">
            <Clock className="text-blue-400 h-5 w-5" />
            <span className="text-blue-400 tracking-wider">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Temperature Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {temperatures.map((esc) => (
          <div key={esc.id} className="bg-slate-800/50 rounded-lg p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-white font-light tracking-wider">{esc.name}</span>
                <div className="text-sm text-slate-400 tracking-wider mt-1">
                  Load: {getLoadPercentage(esc.currentDraw).toFixed(1)}% ({esc.currentDraw.toFixed(1)}A)
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-light tracking-wider ${getTemperatureTextColor(esc.temp)}`}>
                  {esc.temp.toFixed(1)}°C
                </div>
                <div className="text-xs text-slate-400 tracking-wider mt-1">
                  Min: {esc.minTemp === Infinity ? '0.00' : esc.minTemp.toFixed(2)}°C |
                  Max: {esc.maxTemp === -Infinity ? '0.00' : esc.maxTemp.toFixed(2)}°C
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-900/50 rounded-full h-4 overflow-hidden mb-3 border border-gray-800">
              <div
                className={`h-full ${getTemperatureColor(esc.temp)} transition-all duration-500`}
                style={{ width: `${(esc.temp / 120) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-400 tracking-wider">
              <span>0°C</span>
              <span>60°C</span>
              <span>80°C</span>
              <span>120°C</span>
            </div>
          </div>
        ))}
      </div>

      {/* Temperature History Graph */}
      <div className="bg-slate-800/50 rounded-lg p-6 mb-6 border border-gray-800">
        <h3 className="text-white font-light tracking-wider mb-4">TEMPERATURE HISTORY</h3>
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
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                domain={[0, 120]}
                width={50}
                tickFormatter={value => `${value}°C`}
              />
              <Tooltip content={<CustomTooltip />} />
              {temperatures.map((esc) => (
                <Line
                  key={esc.id}
                  type="monotone"
                  name={esc.name}
                  dataKey={esc.name}
                  stroke={
                    esc.temp >= 80 ? '#F87171' :
                    esc.temp >= 60 ? '#FBBF24' :
                    '#34D399'
                  }
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      {temperatures.some(esc => esc.temp >= 60 && esc.temp < 80) && (
        <CustomAlert
          type="warning"
          title="Temperature Warning"
          description={`${temperatures
            .filter(esc => esc.temp >= 60 && esc.temp < 80)
            .map(esc => esc.name)
            .join(', ')} operating at elevated temperatures.`}
        />
      )}

      {temperatures.some(esc => esc.temp >= 80) && (
        <CustomAlert
          type="error"
          title="Critical Temperature Alert"
          description={`Critical temperature on ${temperatures
            .filter(esc => esc.temp >= 80)
            .map(esc => esc.name)
            .join(', ')}!`}
        />
      )}

      {/* Status Footer */}
      <div className="text-sm text-gray-400 tracking-wider mt-4">
        <p>TEMPERATURE MONITORING SYSTEM • {telemetryHistory.length} data points collected</p>
      </div>
    </div>
  );
};

export default DroneTemperatureMonitoring;