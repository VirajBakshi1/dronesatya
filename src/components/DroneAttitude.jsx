import React, { useState, useEffect } from 'react';
import socketManager from '../utils/socketManager';

const DroneAttitude = () => {

  // In your DroneAttitude.jsx
  const calculateGForce = (acceleration) => {
    // Compensate for gravity and calculate total acceleration
    const ax = acceleration.x;
    const ay = acceleration.y;
    const az = acceleration.z;

    // Calculate magnitude of acceleration vector
    const totalAccel = Math.sqrt(ax * ax + ay * ay + az * az);
    return totalAccel / 9.81;
  };
  const [attitudeData, setAttitudeData] = useState({
    // Orientation angles in degrees
    orientation: {
      roll: 0,
      pitch: 0,
      yaw: 0,
    },
    // Angular rates in deg/s
    rates: {
      roll: 0,
      pitch: 0,
      yaw: 0
    },
    // Linear accelerations in m/s²
    acceleration: {
      x: 0,
      y: 0,
      z: 0
    },
    // Computed values
    groundSpeed: 0,
    verticalSpeed: 0,
    slipAngle: 0,
    gForce: 1.0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data) {
        console.log('Received AHRS data:', data.imu);  // Add this line
        // Extract IMU data
        const { orientation, angular_velocity, linear_acceleration } = data.imu;

        // Extract velocity data if available
        const velocity = data.velocity?.linear || { x: 0, y: 0, z: 0 };

        // Calculate derived values
        const groundSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const slipAngle = groundSpeed > 0.1 ?
          Math.atan2(velocity.y, velocity.x) * (180 / Math.PI) : 0;

        // Calculate G-force using the separate function
        const gForce = calculateGForce(linear_acceleration);
        setAttitudeData({
          orientation: {
            roll: orientation.x * (180 / Math.PI),
            pitch: orientation.y * (180 / Math.PI),
            yaw: orientation.z * (180 / Math.PI)
          },
          rates: {
            roll: angular_velocity.x * (180 / Math.PI),
            pitch: angular_velocity.y * (180 / Math.PI),
            yaw: angular_velocity.z * (180 / Math.PI)
          },
          acceleration: linear_acceleration,
          groundSpeed,
          verticalSpeed: velocity.z,
          slipAngle,
          gForce
        });
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

  const formatValue = (value, decimals = 1) => {
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
            <h1 className="text-xl tracking-wider font-light">ATTITUDE</h1>
            {error && <p className="text-red-400 text-sm tracking-wide font-light">{error}</p>}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Artificial Horizon */}
          <div className="relative w-full h-64 border border-gray-800 rounded-lg overflow-hidden bg-gradient-to-b from-blue-600 to-amber-800">
            {/* Attitude Indicator */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `rotateX(${attitudeData.orientation.pitch}deg) rotateZ(${-attitudeData.orientation.roll}deg)`
              }}
            >
              <div className="w-full h-full flex flex-col">
                <div className="h-1/2 bg-blue-400/40 backdrop-blur-sm"></div>
                <div className="h-1/2 bg-amber-800/40 backdrop-blur-sm"></div>
              </div>
            </div>

            {/* Center Reference */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-[2px] bg-white/80"></div>
              <div className="absolute w-[2px] h-12 bg-white/80"></div>
            </div>

            {/* Roll Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="text-lg font-mono text-white/90 tracking-wider">
                {Math.abs(attitudeData.orientation.roll).toFixed(1)}°
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Orientation */}
            <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
              <h2 className="text-sm text-gray-300 mb-4 tracking-wider font-light">ORIENTATION (DEG)</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">ROLL</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.orientation.roll)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">PITCH</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.orientation.pitch)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">YAW</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.orientation.yaw)}
                  </p>
                </div>
              </div>
            </div>

            {/* Angular Rates */}
            <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-800">
              <h2 className="text-sm text-gray-300 mb-4 tracking-wider font-light">ANGULAR RATES (DEG/S)</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">ROLL</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.rates.roll)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">PITCH</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.rates.pitch)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">YAW</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.rates.yaw)}
                  </p>
                </div>
              </div>
            </div>

            {/* Motion Data */}
            <div className="col-span-2 bg-slate-800/50 p-6 rounded-lg border border-gray-800">
              <h2 className="text-sm text-gray-300 mb-4 tracking-wider font-light">MOTION</h2>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">GROUND SPEED</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.groundSpeed)} m/s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">VERTICAL SPEED</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.verticalSpeed)} m/s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">SLIP ANGLE</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.slipAngle)}°
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 tracking-wider mb-2">G-FORCE</p>
                  <p className="text-lg font-mono text-white">
                    {formatValue(attitudeData.gForce, 2)}G
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          <div className="border-t border-gray-800 pt-6">
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-300 tracking-wider font-light">
                DEBUG INFORMATION
              </summary>
              <pre className="mt-4 p-4 bg-slate-950 rounded-lg border border-gray-800 text-xs overflow-auto text-gray-300 font-mono">
                {JSON.stringify(attitudeData, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DroneAttitude;