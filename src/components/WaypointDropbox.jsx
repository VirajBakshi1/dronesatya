import React, { useState, useRef, useEffect } from 'react';
import socketManager from '../utils/socketManager';
import { waypointStore } from '../utils/waypointStore'; // Added import

const WaypointDropbox = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [missionStatus, setMissionStatus] = useState('idle'); // idle, uploaded, running
  const [statusMessage, setStatusMessage] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [waypointCount, setWaypointCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Connect to drone
    socketManager.connect();

    // Subscribe to various status updates
    const handleConnection = (data) => {
      setIsConnected(data.status === 'connected');
      if (data.status === 'connected') {
        console.log('Connected to drone');
      }
    };

    const handleTelemetry = (data) => {
      if (data.flight_mode === 'AUTO') {
        setMissionStatus('running');
      }
    };

    const handleCommandResponse = (data) => {
      console.log('Command response:', data);
      if (data.command === 'upload_waypoints') {
        setIsUploading(false);
        if (data.success) {
          setMissionStatus('uploaded');
          setStatusMessage({
            type: 'success',
            message: 'Mission uploaded to drone. Arm the drone to begin.'
          });
        } else {
          setMissionStatus('idle');
          setStatusMessage({
            type: 'error',
            message: data.message || 'Failed to upload mission'
          });
        }
      }
      else if (data.command === 'cancel_mission') {
        if (data.success) {
          setMissionStatus('idle');
          setSelectedFile(null);
          setStatusMessage({
            type: 'success',
            message: 'Mission aborted. Drone will land safely.'
          });
        }
      }
    };

    socketManager.subscribe('connection', handleConnection);
    socketManager.subscribe('telemetry', handleTelemetry);
    socketManager.subscribe('command_response', handleCommandResponse);

    return () => {
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('command_response', handleCommandResponse);
      socketManager.disconnect();
    };
  }, []);

  const validateWaypointFile = async (file) => {
    try {
      const content = await file.text();
      const lines = content.trim().split('\n');

      if (!lines[0].trim().startsWith('QGC WPL 110')) {
        throw new Error('Invalid file format: Missing QGC WPL 110 header');
      }

      const waypoints = lines.slice(1);

      if (waypoints.length === 0) {
        throw new Error('No waypoints found in file');
      }

      const parsedWaypoints = [];

      for (let i = 0; i < waypoints.length; i++) {
        const parts = waypoints[i].trim().split(/\s+/);
        if (parts.length !== 12) {
          throw new Error(`Invalid waypoint format at line ${i + 2}: Expected 12 parameters`);
        }

        const seq = parseInt(parts[0]);
        const lat = parseFloat(parts[8]);
        const lng = parseFloat(parts[9]);  // Changed from lon to lng
        const alt = parseFloat(parts[10]);

        if (isNaN(lat) || isNaN(lng) || isNaN(alt)) {
          throw new Error(`Invalid coordinates at line ${i + 2}`);
        }

        // Skip waypoints with zero coordinates
        if (lat !== 0 && lng !== 0) {
          parsedWaypoints.push({ seq, lat, lng, alt });  // Changed from lon to lng
        }
      }

      // Update waypoint store
      waypointStore.setWaypoints(parsedWaypoints);

      if (socketManager.isConnected()) {
        socketManager.sendCommand('update_mission_data', {
          waypoints: parsedWaypoints
        });
      }

      setValidationStatus({
        isValid: true,
        message: `Valid waypoint file with ${parsedWaypoints.length} waypoints`
      });
      setWaypointCount(parsedWaypoints.length);
      return true;

    } catch (error) {
      console.error("VALIDATION ERROR:", error);
      setValidationStatus({
        isValid: false,
        message: error.message
      });
      return false;
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.txt')) {
        const isValid = await validateWaypointFile(file);
        if (isValid) {
          setSelectedFile(file);
          setStatusMessage(null);
        } else {
          setSelectedFile(null);
        }
      } else {
        setValidationStatus({
          isValid: false,
          message: 'Please upload a .txt file'
        });
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.txt')) {
      const isValid = await validateWaypointFile(file);
      if (isValid) {
        setSelectedFile(file);
        setStatusMessage(null);
      } else {
        setSelectedFile(null);
      }
    } else {
      setValidationStatus({
        isValid: false,
        message: 'Please upload a .txt file'
      });
    }
  };

  const handleRun = async () => {
    if (!selectedFile || !isConnected) {
      setStatusMessage({
        type: 'error',
        message: !isConnected ? 'Not connected to drone' : 'Please select a file'
      });
      return;
    }

    setIsUploading(true);
    try {
      const content = await selectedFile.text();

      console.log('Sending waypoint upload command...');
      const success = socketManager.sendCommand('upload_waypoints', {
        file_content: content
      });

      if (!success) {
        setIsUploading(false);
        setStatusMessage({
          type: 'error',
          message: 'Failed to send command: Not connected'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage({
        type: 'error',
        message: `Error: ${error.message}`
      });
      setIsUploading(false);
    }
  };

  const handleAbort = () => {
    if (!isConnected) {
      setStatusMessage({
        type: 'error',
        message: 'Not connected to drone'
      });
      return;
    }

    const success = socketManager.sendCommand('cancel_mission');
    if (!success) {
      setStatusMessage({
        type: 'error',
        message: 'Failed to send abort command: Not connected'
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
      {/* Header with Status */}
      <div className="mb-6">
        <h2 className="text-2xl font-light tracking-wider text-center mb-4">WAYPOINT MISSION</h2>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400 tracking-wider">
            {isConnected ? 'CONNECTED TO DRONE' : 'NOT CONNECTED'}
          </span>
        </div>
      </div>

      {/* Status Messages - Enhanced */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-lg border backdrop-blur-sm ${
          statusMessage.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        } tracking-wider font-light`}>
          {statusMessage.message}
        </div>
      )}

      {/* Validation Status - Enhanced */}
      {validationStatus && (
        <div className={`mb-6 p-4 rounded-lg border backdrop-blur-sm ${
          validationStatus.isValid
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <p className="tracking-wider font-light">{validationStatus.message}</p>
          {validationStatus.isValid && waypointCount > 0 && (
            <div className="mt-3 text-sm space-y-1 font-light tracking-wider text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                QGC WPL 110 format
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                {waypointCount} valid waypoints
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                All coordinates in valid range
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dropbox - Enhanced */}
      <div
        className={`border-2 ${
          dragActive
            ? 'border-blue-500/50 bg-blue-500/5'
            : 'border-dashed border-gray-700 bg-slate-800/50'
        } p-8 rounded-lg text-center cursor-pointer transition-all duration-300 hover:bg-slate-800/80
        ${missionStatus === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={missionStatus === 'running' ? null : () => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="hidden"
          disabled={missionStatus === 'running'}
        />
        {selectedFile ? (
          <div className="space-y-2">
            <p className="text-green-300 font-light tracking-wider">✓ {selectedFile.name}</p>
            <p className="text-sm text-gray-400 tracking-wider">File validated successfully</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-300 tracking-wider font-light">
              Drag & drop your <span className="text-blue-400">.txt</span> waypoint file here
              <br />or click to select
            </p>
            <p className="text-sm text-gray-500 tracking-wider">
              Must be in QGC WPL 110 format
            </p>
          </div>
        )}
      </div>

      {/* Upload/Abort Buttons - Enhanced */}
      <div className="flex gap-4 mt-6">
        {missionStatus === 'idle' ? (
          <button
            onClick={handleRun}
            disabled={!selectedFile || !isConnected || isUploading}
            className={`flex-1 py-3 px-4 rounded-lg text-white font-light tracking-wider transition-all duration-300
            ${(selectedFile && isConnected && !isUploading)
              ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
              : 'bg-slate-800/50 text-gray-500 cursor-not-allowed border border-gray-800'}`}
          >
            {isUploading ? 'UPLOADING...' : 'UPLOAD TO DRONE'}
          </button>
        ) : (
          <button
            onClick={handleAbort}
            disabled={!isConnected}
            className="flex-1 py-3 px-4 rounded-lg text-red-300 font-light tracking-wider
              bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all duration-300"
          >
            ABORT MISSION
          </button>
        )}
      </div>

      {/* Status Message - Enhanced */}
      <p className="mt-6 text-sm text-gray-400 text-center tracking-wider font-light">
        {missionStatus === 'uploaded'
          ? 'Mission uploaded to drone - Arm drone to begin execution'
          : missionStatus === 'running'
          ? 'Mission in progress - Click Abort for safe landing'
          : 'Select a waypoint file to begin'}
      </p>

      {/* Debug Info - Enhanced */}
      <div className="mt-6 pt-4 border-t border-gray-800 text-sm text-gray-400 tracking-wider font-light flex items-center justify-center gap-4">
        <span>STATUS: {missionStatus.toUpperCase()}</span>
        <span className="text-gray-600">•</span>
        <span>CONNECTED: {isConnected ? 'YES' : 'NO'}</span>
        <span className="text-gray-600">•</span>
        <span>UPLOADING: {isUploading ? 'YES' : 'NO'}</span>
      </div>
    </div>
  );
};

export default WaypointDropbox;