import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import socketManager from '../utils/socketManager';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Create a custom drone icon
const droneIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Component to handle map position updates
function MapUpdater({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position[0] !== 0 && position[1] !== 0) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  
  return null;
}

const DroneMap = () => {
  const [telemetryData, setTelemetryData] = useState({
    latitude: 0,
    longitude: 0,
    altitudeMSL: 0,
    armed: false,
    flight_mode: '',
    connected: false
  });
  const [pathHistory, setPathHistory] = useState([]);
  const [error, setError] = useState(null);
  const maxPathPoints = 100;

  // Memoize the current position
  const position = useMemo(() => 
    [telemetryData.latitude, telemetryData.longitude],
    [telemetryData.latitude, telemetryData.longitude]
  );

  useEffect(() => {
    // Connect to drone
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data) {
        console.log('Map received telemetry:', data); // Debug log
        setTelemetryData(prevData => ({
          ...prevData,
          ...data
        }));
        
        // Update path history only if we have valid coordinates
        if (data.latitude !== 0 && data.longitude !== 0) {
          const newPosition = [data.latitude, data.longitude];
          setPathHistory(prev => {
            const newHistory = [...prev, newPosition];
            return newHistory.slice(-maxPathPoints);
          });
        }
      }
    };

    const handleConnection = (data) => {
      setError(null);
      if (data.status === 'connected') {
        console.log('Connected:', socketManager.socket.id);
        setTelemetryData(prev => ({
          ...prev,
          connected: true
        }));
      } else {
        console.log('Disconnected');
        setTelemetryData(prev => ({
          ...prev,
          connected: false
        }));
      }
    };

    const handleError = (data) => {
      console.error('Connection error:', data.error);
      setError(`Connection error: ${data.error.message || 'Unknown error'}`);
      setTelemetryData(prev => ({
        ...prev,
        connected: false
      }));
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

  return (
    <div className="w-full h-[500px] relative">
      {error && (
        <div className="absolute top-0 left-0 right-0 z-[2000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <MapContainer 
        center={position} 
        zoom={18} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Show marker only if we have valid coordinates */}
        {position[0] !== 0 && position[1] !== 0 && (
          <Marker 
            position={position} 
            icon={droneIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold mb-1">Drone Status</div>
                <div>Latitude: {telemetryData.latitude.toFixed(6)}°</div>
                <div>Longitude: {telemetryData.longitude.toFixed(6)}°</div>
                <div>Altitude MSL: {telemetryData.altitudeMSL.toFixed(2)}m</div>
                <div>Armed: {telemetryData.armed ? 'Yes' : 'No'}</div>
                <div>Mode: {telemetryData.flight_mode}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Path trail */}
        {pathHistory.length > 1 && (
          <Polyline
            positions={pathHistory}
            color="red"
            weight={2}
            opacity={0.7}
          />
        )}

        {/* Map position updater */}
        <MapUpdater position={position} />
      </MapContainer>

      {/* Connection status and flight mode indicators */}
      <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${telemetryData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {telemetryData.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {telemetryData.connected && (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                telemetryData.armed ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {telemetryData.armed ? 'ARMED' : 'DISARMED'}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                {telemetryData.flight_mode || 'UNKNOWN'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DroneMap;