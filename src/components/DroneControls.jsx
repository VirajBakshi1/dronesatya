import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

// Replace with your Jetson's IP address
const API_URL = 'http://quickverse.hopto.org:5001/api';
const SOCKET_URL = 'http://quickverse.hopto.org:5001';

const DroneControls = () => {
  const [pressedKeys, setPressedKeys] = useState([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pwmValues, setPwmValues] = useState({
    throttle: 1500,
    yaw: 1500,
    pitch: 1500,
    roll: 1500
  });

  // Socket.io setup
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('WebSocket Connected');
    });

    socket.on('pwm_values', (data) => {
      setPwmValues(data);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        setStatus(data);
        if (data.data?.pwm_values) {
          setPwmValues(data.data.pwm_values);
        }
      } catch (error) {
        console.log('Status check failed:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (command, params = {}) => {
    try {
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

      if (!data.success && command !== 'status') {
        setError(`Command sent: ${data.message}`);
      }
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      setError('Failed to send command');
      return { success: false, message: error.message };
    }
  };

  const handleKeyDown = async (event) => {
    const key = event.key.toUpperCase();
    if (Object.keys(keyFunctions).includes(key) && !pressedKeys.includes(key)) {
      setPressedKeys((prevKeys) => [...prevKeys, key]);
      await sendCommand('move', { key: key.toLowerCase(), pressed: true });
    }
  };

  const handleKeyUp = async (event) => {
    const key = event.key.toUpperCase();
    if (Object.keys(keyFunctions).includes(key)) {
      setPressedKeys((prevKeys) => prevKeys.filter((k) => k !== key));
      await sendCommand('move', { key: key.toLowerCase(), pressed: false });
    }
  };

  const keyFunctions = {
    W: ['Pitch Forward'],
    S: ['Pitch Backward'],
    A: ['Yaw Left'],
    D: ['Yaw Right'],
    ARROWUP: ['Throttle Up'],
    ARROWDOWN: ['Throttle Down'],
    ARROWLEFT: ['Roll Left'],
    ARROWRIGHT: ['Roll Right'],
  };

  const handleButtonClick = (action) => {
    setSelectedAction(action);
    setIsConfirmationOpen(true);
  };

  const handleConfirmation = async () => {
    const actionMap = {
      'Altitude Hold': 'altitude-hold',
      'Land': 'land',
      'Return to Launch': 'rtl',
      'Arm': 'arm',
      'Disarm': 'disarm'
    };

    const endpoint = actionMap[selectedAction];
    if (endpoint) {
      try {
        const result = await sendCommand(endpoint);
        console.log(`${selectedAction} executed:`, result);
        if (result.message) {
          setError(`Command sent: ${result.message}`);
        }
      } catch (err) {
        console.error('Command error:', err);
        setError(`Failed to send ${selectedAction} command`);
      }
    }

    setIsConfirmationOpen(false);
  };

  const renderPWMValues = () => (
    <div className="mb-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">PWM Values</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>Throttle: {pwmValues.throttle}</div>
        <div>Yaw: {pwmValues.yaw}</div>
        <div>Pitch: {pwmValues.pitch}</div>
        <div>Roll: {pwmValues.roll}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {renderPWMValues()}

      {status && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">Drone Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Connection Status: {status.success ? '✅' : '⚠️'}</div>
            {status.data?.armed !== undefined && (
              <div>Armed: {status.data.armed ? '✅' : '❌'}</div>
            )}
            {status.data?.mode && (
              <div>Mode: {status.data.mode}</div>
            )}
          </div>
        </div>
      )}

      <div
        className="border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        tabIndex="0"
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        <h2 className="text-xl font-bold mb-2">Drone Controls</h2>
        <p className="mb-4">Control mapping:</p>
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div>W/S: Pitch Forward/Back</div>
          <div>A/D: Yaw Left/Right</div>
          <div>↑/↓: Throttle Up/Down</div>
          <div>←/→: Roll Left/Right</div>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center space-y-4">
          <div className="flex flex-row items-center space-x-2">
            {['W'].map((key) => (
              <div key={key} className="flex items-center space-x-0">
                <span className={`inline-block px-4 py-2 rounded-lg ${
                  pressedKeys.includes(key) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {key}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-row items-center space-x-2">
            {['A', 'S', 'D'].map((key) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={`inline-block px-4 py-2 rounded-lg ${
                  pressedKeys.includes(key) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {key}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-row items-center space-x-2">
            {['ARROWUP'].map((key) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={`inline-block px-4 py-2 rounded-lg ${
                  pressedKeys.includes(key) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  ↑
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-row items-center space-x-2">
            {['ARROWLEFT', 'ARROWDOWN', 'ARROWRIGHT'].map((key) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={`inline-block px-4 py-2 rounded-lg ${
                  pressedKeys.includes(key) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {key === 'ARROWLEFT' ? '←' : key === 'ARROWDOWN' ? '↓' : '→'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        {[
          'Altitude Hold',
          'Land',
          'Return to Launch',
          'Arm',
          'Disarm',
        ].map((action) => (
          <button
            key={action}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => handleButtonClick(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedAction.toLowerCase()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmation}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DroneControls;