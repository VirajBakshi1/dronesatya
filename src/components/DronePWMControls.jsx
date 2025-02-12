import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../utils/socketManager';

const DronePWMControl = () => {
  // A fixed PWM step; adjust as needed
  const PWM_STEP = 50;
  // Initial PWM baseline; adjust as needed
  const INITIAL_PWM = { throttle: 1000, yaw: 1500, pitch: 1500, roll: 1500 };

  // State management
  const [pwmValues, setPwmValues] = useState(INITIAL_PWM);
  const [pendingPWM, setPendingPWM] = useState(INITIAL_PWM);
  const [flightMode, setFlightMode] = useState('STABILIZE');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [pendingFlightAction, setPendingFlightAction] = useState(null);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  // Toggle for auto-updating PWM values via keyboard
  const [autoPWMUpdate, setAutoPWMUpdate] = useState(false);
  // New state for the modal: which button is selected ('confirm' or 'cancel')
  const [selectedModalButton, setSelectedModalButton] = useState('confirm');

  // Refs for key presses and intervals
  const pressedKeysRef = useRef(new Set());
  const pwmUpdateInterval = useRef(null);
  const modalRef = useRef(null);

  // Define flightActions array in component scope.
  const flightActions = [
    { name: 'Arm', endpoint: 'arm', color: 'bg-slate-700 hover:bg-slate-500' },
    { name: 'Disarm', endpoint: 'disarm', color: 'bg-slate-700 hover:bg-slate-500' },
    { name: 'Altitude Hold', endpoint: 'altitude-hold', color: 'bg-slate-700 hover:bg-slate-500' },
    { name: 'Loiter', endpoint: 'loiter', color: 'bg-slate-700 hover:bg-slate-500' },
    { name: 'Smart RTL', endpoint: 'smart-rtl', color: 'bg-slate-700 hover:bg-slate-500' },
    { name: 'Land', endpoint: 'land', color: 'bg-slate-700 hover:bg-slate-500' }
  ];

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

  // Socket.io setup
  useEffect(() => {
    socketManager.connect();

    const handlePWM = (data) => {
      if (data) {
        setPwmValues(data);
        if (pressedKeysRef.current.size === 0) {
          setPendingPWM(data);
        }
      }
    };
    socketManager.subscribe('pwm_values', handlePWM);

    const handleTelemetry = (data) => {
      if (data?.battery_level !== undefined) {
        setBatteryLevel(data.battery_level);
      }
      if (data?.armed !== undefined) {
        setArmed(data.armed);
      }
      if (data?.flight_mode !== undefined) {
        setFlightMode(data.flight_mode);
      }
    };
    socketManager.subscribe('telemetry', handleTelemetry);

    const handleConnection = (data) => {
      setError(null);
      if (data.status === 'connected') {
        console.log('Connected:', socketManager.socket.id);
      } else {
        console.log('Disconnected');
      }
    };
    socketManager.subscribe('connection', handleConnection);

    const handleError = (data) => {
      console.error('Connection failed:', data.error);
      setError(`Socket connection error: ${data.error.message || 'Unknown error'}`);
    };
    socketManager.subscribe('error', handleError);

    return () => {
      socketManager.unsubscribe('pwm_values', handlePWM);
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.unsubscribe('error', handleError);
      socketManager.disconnect();
    };
  }, []);

  // Update pending PWM from held keys only when autoPWMUpdate is enabled.
  useEffect(() => {
    const updatePendingPWMForHeldKeys = () => {
      if (!autoPWMUpdate) return;

      pressedKeysRef.current.forEach((key) => {
        const mapping = keyMappings[key];
        if (mapping) {
          setPendingPWM(prev => {
            const currentValue = prev[mapping.control];
            const newValue = mapping.increment
              ? Math.min(currentValue + PWM_STEP, 2000)
              : Math.max(currentValue - PWM_STEP, 1000);
            return { ...prev, [mapping.control]: newValue };
          });
        }
      });
    };

    pwmUpdateInterval.current = setInterval(updatePendingPWMForHeldKeys, 100);
    return () => clearInterval(pwmUpdateInterval.current);
  }, [autoPWMUpdate]);

  // Whenever confirmed PWM values change and no keys are pressed, update pendingPWM.
  useEffect(() => {
    if (pressedKeysRef.current.size === 0) {
      setPendingPWM(pwmValues);
    }
  }, [pwmValues]);

  // Auto-update PWM command when toggle is enabled
  useEffect(() => {
    let interval;
    if (autoPWMUpdate) {
      interval = setInterval(() => {
        handlePWMChangeNow();
      }, 300); // Adjust interval as needed
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPWMUpdate]);

  // When the modal opens, set default selection to 'confirm' and focus the modal.
  useEffect(() => {
    if (pendingFlightAction) {
      setSelectedModalButton('confirm');
      modalRef.current?.focus();
    }
  }, [pendingFlightAction]);

  // API communication
  const sendCommand = async (command, params = {}) => {
    try {
      setError(null);
      console.log(`Sending command: ${command}`, params);
      return socketManager.sendCommand(command, params);
    } catch (error) {
      const errorMessage = error.message || 'Command failed';
      setError(errorMessage);
      console.error('Command failed:', error);
      return false;
    }
  };

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

  // "Change Now" sends the pending PWM values (used by auto-update)
  const handlePWMChangeNow = async () => {
    try {
      setError(null);
      console.log("Sending pending PWM values:", pendingPWM);
      const result = await sendCommand('set_pwm', pendingPWM);
      if (result && result.success) {
        console.log("PWM update successful");
      } else {
        console.error("PWM update failed:", result);
        setError(result?.message || "Failed to update PWM values");
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  // Process key events for PWM only if autoPWMUpdate is enabled.
  const handleKeyDown = (event) => {
    // Allow flight action confirmation keys even when autoPWMUpdate is disabled.
    if (pendingFlightAction) {
      // Do nothing here; modal handles its own key events.
      return;
    }
    if (!autoPWMUpdate) return;

    const key = event.key.toLowerCase();
    if (keyMappings[key] && !pressedKeysRef.current.has(key)) {
      event.preventDefault();
      pressedKeysRef.current.add(key);
      setPressedKeys(new Set(pressedKeysRef.current));
    }
  };

  const handleKeyUp = (event) => {
    if (!autoPWMUpdate) return;

    const key = event.key.toLowerCase();
    if (keyMappings[key]) {
      event.preventDefault();
      pressedKeysRef.current.delete(key);
      setPressedKeys(new Set(pressedKeysRef.current));
      if (pressedKeysRef.current.size === 0) {
        setPendingPWM(pwmValues);
      }
    }
  };

  // Dedicated key handler for the modal
  const handleModalKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Tab') {
      event.preventDefault();
      // Toggle selection between 'confirm' and 'cancel'
      setSelectedModalButton(prev => (prev === 'confirm' ? 'cancel' : 'confirm'));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedModalButton === 'confirm') {
        handleFlightAction(pendingFlightAction);
      }
      setPendingFlightAction(null);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPendingFlightAction(null);
    }
  };

  // Render a simple PWM gauge
  const renderPWMGauge = (label, value, control) => {
    const percentage = ((value - 1000) / 1000) * 100;
    const isActive = Array.from(pressedKeysRef.current).some(
      key => keyMappings[key].control === control
    );

    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className={`font-semibold ${isActive ? 'text-blue-600' : ''}`}>
            {label}
          </span>
          <span>{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-600' : 'bg-blue-400'}`}
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
              <span className={`px-2 py-1 rounded ${batteryLevel > 20 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {batteryLevel}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PWM Values Display */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">PWM Values</h2>
        {renderPWMGauge('Throttle', pendingPWM.throttle, 'throttle')}
        {renderPWMGauge('Yaw', pendingPWM.yaw, 'yaw')}
        {renderPWMGauge('Pitch', pendingPWM.pitch, 'pitch')}
        {renderPWMGauge('Roll', pendingPWM.roll, 'roll')}
        {/* Toggle slider replaces the "Change Now" button */}
        <div className="mt-4 flex items-center">
          <span className="mr-2">Auto Update PWM:</span>
          <button
            onClick={() => setAutoPWMUpdate(prev => !prev)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
              autoPWMUpdate ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                autoPWMUpdate ? 'translate-x-6' : 'translate-x-1'
              }`}
            ></span>
          </button>
        </div>
      </div>

      {/* Flight Controls */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Flight Controls</h2>
        <div className="grid grid-cols-3 gap-4">
          {flightActions.map((action) => {
            const isLoading = actionInProgress === action.endpoint;
            return (
              <button
                key={action.name}
                onClick={() => setPendingFlightAction(action)}
                className={`px-4 py-2 rounded text-white font-semibold ${action.color} transition-colors ${isLoading ? 'animate-pulse' : ''}`}
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
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded text-black bg-gray-200 mr-2 font-mono ${
                pressedKeysRef.current.has(key) ? 'bg-blue-500 text-white' : ''
              }`}>
                {key === 'arrowup'
                  ? '↑'
                  : key === 'arrowdown'
                  ? '↓'
                  : key === 'arrowleft'
                  ? '←'
                  : key === 'arrowright'
                  ? '→'
                  : key.toUpperCase()}
              </span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Flight Actions */}
      {pendingFlightAction && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onKeyDown={handleModalKeyDown}
          tabIndex={0}
          ref={modalRef}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="bg-slate-900 text-white p-6 rounded-lg shadow-lg z-10">
            <h3 className="text-lg font-bold mb-4">Confirm Action</h3>
            <p className="mb-4">
              Are you sure you want to execute{' '}
              <span className="font-semibold">{pendingFlightAction.name}</span>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setPendingFlightAction(null)}
                className={`px-4 py-2 rounded bg-red-600 hover:bg-red-500 ${
                  selectedModalButton === 'cancel' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleFlightAction(pendingFlightAction);
                  setPendingFlightAction(null);
                }}
                className={`px-4 py-2 rounded bg-green-600 hover:bg-green-500 ${
                  selectedModalButton === 'confirm' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                Confirm
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Use Left/Right arrow keys to select and Enter to confirm.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DronePWMControl;
