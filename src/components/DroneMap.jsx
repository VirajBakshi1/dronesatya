import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
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
    altitudeRelative: 0,
    gpsFix: 0,
    satellites: 0
  });
  const [pathHistory, setPathHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const maxPathPoints = 100;

  // Memoize the current position
  const position = useMemo(() => 
    [telemetryData.latitude, telemetryData.longitude],
    [telemetryData.latitude, telemetryData.longitude]
  );

  useEffect(() => {
    const socket = io('http://172.29.172.210:5001', {   // Changed only this line
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Map connected to telemetry server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Map disconnected from telemetry server');
      setConnected(false);
    });

    socket.on('telemetry', (data) => {
      if (data && data.latitude && data.longitude) {
        setTelemetryData(data);
        
        // Update path history
        const newPosition = [data.latitude, data.longitude];
        setPathHistory(prev => {
          const newHistory = [...prev, newPosition];
          return newHistory.slice(-maxPathPoints);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-[500px] relative">
      <MapContainer 
        center={position} 
        zoom={18} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Dynamic marker position */}
        {position[0] !== 0 && position[1] !== 0 && (
          <Marker 
            position={position} 
            icon={droneIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold mb-1">Drone Location</div>
                <div>Latitude: {telemetryData.latitude.toFixed(6)}°</div>
                <div>Longitude: {telemetryData.longitude.toFixed(6)}°</div>
                <div>Altitude: {telemetryData.altitudeMSL.toFixed(2)}m</div>
                <div>GPS Fix: {telemetryData.gpsFix}D</div>
                <div>Satellites: {telemetryData.satellites}</div>
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

      {/* Connection status */}
      <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DroneMap;
