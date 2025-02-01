import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Replace with your Jetson's IP address
const API_URL = "http://172.29.172.210:5001"  // Jetson's ZeroTier IP
const SOCKET_URL = 'ws://172.29.172.210:5001/socket.io/?EIO=4&transport=websocket';

const DronePWMControl = () => {
  // State management
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [pwmValues, setPwmValues] = useState({
    throttle: 1000,
    yaw: 1500,
    pitch: 1500,
    roll: 1500
  });
  const [flightMode, setFlightMode] = useState('STABILIZE');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Refs for continuous key press
  const pressedKeysRef = useRef(new Set());
  const pwmUpdateInterval = useRef(null);

  // Key mapping configuration
  const keyMappings = {
    'w': { action: 'Throttle Up', control: 'throttle', increment: true },
    's': { action: 'Throttle Down', control: 'throttle', increment: false },
    'a': { action: 'Yaw Left', control: 'yaw', increment: false },
    'd': { action: 'Yaw Right', control: 'yaw', increment: true },
    'arrowup': { action: 'Pitch Forward', control: 'pitch', increment: false },
    'arrowdown': { action: 'Pitch Backward', control: 'pitch', increment: true },
    'arrowleft': { action: 'Roll Left', control: 'roll', increment: false },
    'arrowright': { action: 'Roll Right', control: 'roll', increment: true }
  };

  // Flight mode actions with updated configuration
  const flightActions = [
    { name: 'Arm', endpoint: 'arm', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: false },
    { name: 'Disarm', endpoint: 'disarm', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: true },
    { name: 'Altitude Hold', endpoint: 'altitude-hold', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: true },
    { name: 'Loiter', endpoint: 'loiter', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: true },
    { name: 'Smart RTL', endpoint: 'smart-rtl', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: true },
    { name: 'Land', endpoint: 'land', color: 'bg-slate-700 hover:bg-slate-500', requiresArmed: true }
  ];

  // Socket.io setup
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('WebSocket Connected');
    });

    socket.on('pwm_values', (data) => {
      setPwmValues(data);
    });

    socket.on('telemetry', (data) => {
      if (data.battery_level !== undefined) {
        setBatteryLevel(data.battery_level);
      }
    });

    return () => socket.disconnect();
  }, []);

  // Continuous PWM update for held keys
  useEffect(() => {
    const updatePWMForHeldKeys = () => {
      pressedKeysRef.current.forEach(async (key) => {
        await sendCommand('move', { key, pressed: true, continuous: true });
      });
    };

    pwmUpdateInterval.current = setInterval(updatePWMForHeldKeys, 100);
    return () => clearInterval(pwmUpdateInterval.current);
  }, []);

  // Status polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        if (data.data) {
          setPwmValues(data.data.pwm_values || pwmValues);
          setArmed(data.data.armed || false);
          setFlightMode(data.data.flight_mode || 'STABILIZE');
        }
      } catch (error) {
        console.log('Status check failed:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // API communication
  const sendCommand = async (command, params = {}) => {
    try {
      setError(null);
      console.log(`Sending command: ${command}`);
      const response = await fetch(`${API_URL}/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      console.log(`Command ${command} response:`, data);
      
      if (data.data?.pwm_values) {
        setPwmValues(data.data.pwm_values);
      }
      if (data.data?.armed !== undefined) {
        setArmed(data.data.armed);
      }
      if (data.data?.flight_mode) {
        setFlightMode(data.data.flight_mode);
      }
      
      if (!data.success) {
        setError(data.message);
      }
      return data;
    } catch (error) {
      const errorMessage = error.message || 'Command failed';
      setError(errorMessage);
      console.error('API call failed:', error);
      return null;
    }
  };

  // Handle flight mode actions
  const handleFlightAction = async (action) => {
    try {
      setActionInProgress(action.endpoint);
      setError(null);
      console.log(`Executing ${action.name} command...`);
      const result = await sendCommand(action.endpoint);
      if (result && result.success) {
        console.log(`${action.name} command successful`);
      } else {
        console.error(`${action.name} command failed:`, result);
        setError(result?.message || `Failed to execute ${action.name}`);
      }
    } catch (error) {
      console.error(`Error executing ${action.name}:`, error);
      setError(`Error: ${error.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Key event handlers
  const handleKeyDown = async (event) => {
    const key = event.key.toLowerCase();
    if (keyMappings[key] && !pressedKeysRef.current.has(key)) {
      event.preventDefault();
      pressedKeysRef.current.add(key);
      setPressedKeys(new Set(pressedKeysRef.current));
      await sendCommand('move', { key, pressed: true });
    }
  };

  const handleKeyUp = async (event) => {
    const key = event.key.toLowerCase();
    if (keyMappings[key]) {
      event.preventDefault();
      pressedKeysRef.current.delete(key);
      setPressedKeys(new Set(pressedKeysRef.current));
      await sendCommand('move', { key, pressed: false });
    }
  };

  // Render PWM gauge
  const renderPWMGauge = (label, value, control) => {
    const percentage = ((value - 1000) / 1000) * 100;
    const isActive = Array.from(pressedKeysRef.current).some(
      key => keyMappings[key].control === control
    );

    return (
      <div className="mb-4 ">
        <div className="flex justify-between mb-1">
          <span className={`font-semibold ${isActive ? 'text-blue-600' : ''}`}>
            {label}
          </span>
          <span>{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              isActive ? 'bg-blue-600' : 'bg-blue-400'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="p-6 bg-slate-900 text-white rounded-lg shadow-lg max-w-2xl mx-auto"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ outline: 'none' }}
    >
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Status Bar */}
      <div className="mb-6 flex items-center justify-between bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="font-bold mr-2">Status:</span>
            <span className={`px-2 py-1 rounded ${armed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {armed ? 'Armed' : 'Disarmed'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-bold mr-2">Mode:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {flightMode}
            </span>
          </div>
          {batteryLevel !== null && (
            <div className="flex items-center">
              <span className="font-bold mr-2">Battery:</span>
              <span className={`px-2 py-1 rounded ${
                batteryLevel > 20 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {batteryLevel}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PWM Values Display */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">PWM Values</h2>
        {renderPWMGauge('Throttle', pwmValues.throttle, 'throttle')}
        {renderPWMGauge('Yaw', pwmValues.yaw, 'yaw')}
        {renderPWMGauge('Pitch', pwmValues.pitch, 'pitch')}
        {renderPWMGauge('Roll', pwmValues.roll, 'roll')}
      </div>

      {/* Flight Controls */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Flight Controls</h2>
        <div className="grid grid-cols-3 gap-4">
          {flightActions.map((action) => {
            const isDisabled = action.requiresArmed ? !armed : (action.name === 'Arm' ? armed : !armed);
            const isLoading = actionInProgress === action.endpoint;
            
            return (
              <button
                key={action.name}
                onClick={() => handleFlightAction(action)}
                className={`px-4 py-2 rounded text-white font-semibold 
                  ${action.color} transition-colors
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isLoading ? 'animate-pulse' : ''}
                `}
                disabled={isDisabled || isLoading}
              >
                {isLoading ? 'Processing...' : action.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Instructions */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold mb-3">Control Mapping</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {Object.entries(keyMappings).map(([key, { action }]) => (
            <div key={key} className="flex items-center">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded text-black bg-gray-200 mr-2 font-mono
                ${pressedKeysRef.current.has(key) ? 'bg-blue-00 text-white' : ''}`}>
                {key === 'arrowup' ? '↑' :
                 key === 'arrowdown' ? '↓' :
                 key === 'arrowleft' ? '←' :
                 key === 'arrowright' ? '→' :
                 key.toUpperCase()}
              </span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DronePWMControl;