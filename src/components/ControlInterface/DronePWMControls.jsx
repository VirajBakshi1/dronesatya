import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../../utils/socketManager';

const DronePWMControl = () => {
  const PWM_STEP = 50;
  const INITIAL_PWM = { throttle: 1000, yaw: 1500, pitch: 1500, roll: 1500 };

  const [pwmValues, setPwmValues] = useState(INITIAL_PWM);
  const [pendingPWM, setPendingPWM] = useState(INITIAL_PWM);
  const [flightMode, setFlightMode] = useState('STABILIZE');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [pendingFlightAction, setPendingFlightAction] = useState(null);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [autoPWMUpdate, setAutoPWMUpdate] = useState(false);
  const [selectedModalButton, setSelectedModalButton] = useState('confirm');

  const pressedKeysRef = useRef(new Set());
  const pwmUpdateInterval = useRef(null);
  const modalRef = useRef(null);

  const flightActions = [
    { name: 'Arm', endpoint: 'arm', color: 'bg-slate-700 hover:bg-slate-600' },
    { name: 'Disarm', endpoint: 'disarm', color: 'bg-slate-700 hover:bg-slate-600' },
    { name: 'Altitude Hold', endpoint: 'altitude-hold', color: 'bg-slate-700 hover:bg-slate-600' },
    { name: 'Loiter', endpoint: 'loiter', color: 'bg-slate-700 hover:bg-slate-600' },
    { name: 'Smart RTL', endpoint: 'smart-rtl', color: 'bg-slate-700 hover:bg-slate-600' },
    { name: 'Land', endpoint: 'land', color: 'bg-slate-700 hover:bg-slate-600' },
  ];

  const keyMappings = {
    w: { action: 'Throttle Up', control: 'throttle', increment: true },
    s: { action: 'Throttle Down', control: 'throttle', increment: false },
    a: { action: 'Yaw Left', control: 'yaw', increment: false },
    d: { action: 'Yaw Right', control: 'yaw', increment: true },
    p: { action: 'Pitch Forward', control: 'pitch', increment: false },
    ';': { action: 'Pitch Backward', control: 'pitch', increment: true },
    l: { action: 'Roll Left', control: 'roll', increment: false },
    "'": { action: 'Roll Right', control: 'roll', increment: true },
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
          setPendingPWM((prev) => {
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
      }, 300);
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

  // "Change Now" sends the pending PWM values
  const handlePWMChangeNow = async () => {
    try {
      setError(null);
      console.log('Sending pending PWM values:', pendingPWM);
      const result = await sendCommand('set_pwm', pendingPWM);
      if (result && result.success) {
        console.log('PWM update successful');
      } else {
        console.error('PWM update failed:', result);
        setError(result?.message || 'Failed to update PWM values');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  // Key events for PWM
  const handleKeyDown = (event) => {
    if (pendingFlightAction) return;
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

  // Modal key handler
  const handleModalKeyDown = (event) => {
    event.stopPropagation();
    if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      event.preventDefault();
      setSelectedModalButton((prev) => (prev === 'confirm' ? 'cancel' : 'confirm'));
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

  // Enhanced PWM gauge rendering
  const renderPWMGauge = (label, value, control) => {
    const percentage = ((value - 1000) / 1000) * 100;
    const isActive = Array.from(pressedKeysRef.current).some(
      (key) => keyMappings[key].control === control
    );

    return (
      <div className="mb-6" key={control}>
        <div className="flex items-center justify-between mb-2">
          <span className={`font-light tracking-wider ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
            {label.toUpperCase()}
          </span>
          <span className="font-mono text-gray-400">{value}</span>
        </div>
        <div className="w-full bg-slate-950/50 rounded-full h-2 border border-gray-800">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isActive ? 'bg-blue-500' : 'bg-blue-400/50'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50 max-w-5xl mx-auto p-6"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ outline: 'none' }}
    >
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg tracking-wider font-light">
          {error}
        </div>
      )}

      {/* Three-Column Layout */}
      <div className="flex flex-row space-x-8">
        {/* Column 1: Status & Flight Controls */}
        <div className="w-1/3 space-y-6">
          {/* Status Bar */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800 space-y-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 tracking-wider">STATUS</span>
                <span className={`px-3 py-1 rounded-md text-xs tracking-wider font-light ${
                  armed 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {armed ? 'ARMED' : 'DISARMED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 tracking-wider">MODE</span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs tracking-wider font-light border border-blue-500/30">
                  {flightMode}
                </span>
              </div>
              {batteryLevel !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 tracking-wider">BATTERY</span>
                  <span className={`px-3 py-1 rounded-md text-xs tracking-wider font-light ${
                    batteryLevel > 20
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {batteryLevel}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Flight Controls */}
          <div className="space-y-4">
            <h2 className="text-lg font-light tracking-wider">FLIGHT CONTROLS</h2>
            <div className="grid grid-cols-2 gap-4">
              {flightActions.map((action) => {
                const isLoading = actionInProgress === action.endpoint;
                return (
                  <button
                    key={action.name}
                    onClick={() => setPendingFlightAction(action)}
                    className={`px-4 py-2 rounded-lg font-light tracking-wider text-white
                      bg-slate-800/50 hover:bg-slate-700/50 border border-gray-800
                      ${isLoading ? 'animate-pulse' : ''}`}
                  >
                    {isLoading ? 'PROCESSING...' : action.name.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: PWM Values & Toggle */}
        <div className="w-1/3 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-light tracking-wider">PWM VALUES</h2>
            {/* Gauges */}
            {renderPWMGauge('Throttle', pendingPWM.throttle, 'throttle')}
            {renderPWMGauge('Yaw', pendingPWM.yaw, 'yaw')}
            {renderPWMGauge('Pitch', pendingPWM.pitch, 'pitch')}
            {renderPWMGauge('Roll', pendingPWM.roll, 'roll')}

            {/* Auto Update Toggle */}
            <div className="flex items-center justify-between mt-6 bg-slate-800/50 p-4 rounded-lg border border-gray-800">
              <span className="text-gray-300 tracking-wider">AUTO UPDATE PWM</span>
              <button
                onClick={() => setAutoPWMUpdate((prev) => !prev)}
                className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ${
                  autoPWMUpdate ? 'bg-green-500/50' : 'bg-red-500/50'
                } border ${autoPWMUpdate ? 'border-green-500/30' : 'border-red-500/30'}`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    autoPWMUpdate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Control Mapping */}
        <div className="w-1/3 space-y-4">
          <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
            <h3 className="text-lg font-light tracking-wider mb-6">CONTROL MAPPING</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(keyMappings).map(([key, { action }]) => {
                const isPressed = pressedKeysRef.current.has(key);
                const displayKey = key === 'p' ? 'P' : key === ';' ? ';' : key === 'l' ? 'L' : key === "'" ? "'" : key.toUpperCase();
                return (
                  <div key={key} className="flex items-center space-x-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg 
                      border font-mono text-sm transition-all duration-300 ${
                      isPressed 
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                        : 'bg-slate-900/50 text-gray-400 border-gray-800'
                    }`}>
                      {displayKey}
                    </span>
                    <span className="text-gray-400 text-sm tracking-wider">{action}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal - Enhanced */}
      {pendingFlightAction && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onKeyDown={handleModalKeyDown}
          tabIndex={0}
          ref={modalRef}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-slate-900/90 text-white p-8 rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm z-10 max-w-md w-full">
            <h3 className="text-xl font-light tracking-wider mb-4">CONFIRM ACTION</h3>
            <p className="mb-6 text-gray-300 tracking-wide">
              Are you sure you want to execute{' '}
              <span className="text-blue-400">{pendingFlightAction.name.toUpperCase()}</span>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setPendingFlightAction(null)}
                className={`px-6 py-3 rounded-lg tracking-wider font-light
                  ${selectedModalButton === 'cancel' 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 ring-2 ring-red-500/50' 
                    : 'bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20'}`}
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  await handleFlightAction(pendingFlightAction);
                  setPendingFlightAction(null);
                }}
                className={`px-6 py-3 rounded-lg tracking-wider font-light
                  ${selectedModalButton === 'confirm' 
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
  );
};

export default DronePWMControl;