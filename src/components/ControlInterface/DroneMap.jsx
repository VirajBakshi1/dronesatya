import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import socketManager from '../../utils/socketManager';
import L from 'leaflet';
import { waypointStore } from '../../utils/waypointStore';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Custom icons
const droneIcon = L.divIcon({
    className: 'drone-icon',
    html: `
        <div class='marker-container'>
            <div class='center-dot'></div>
            <div class='ring'></div>
            <div class='crosshair'></div>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const waypointIcon = L.divIcon({
    className: 'waypoint-icon',
    html: `
        <div class='waypoint-container'>
            <div class='waypoint-dot'></div>
            <div class='waypoint-ring'></div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Map type enum
const MAP_TYPES = {
  OSM: 'OpenStreetMap',
  ARCGIS: 'ArcGIS World Imagery'
};

// MapUpdater component for Leaflet
function MapUpdater({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

// TileLayerSelector component
function TileLayerSelector({ mapType }) {
  if (mapType === MAP_TYPES.OSM) {
    return (
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    );
  } else if (mapType === MAP_TYPES.ARCGIS) {
    return (
      <TileLayer
        attribution='© <a href="https://www.arcgis.com/">ArcGIS</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={23}
        maxNativeZoom={19}
      />
    );
  }
  return null;
}

const DroneMap = () => {
  // Existing state
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
  const [missionWaypoints, setMissionWaypoints] = useState([]);
  const [showMissionPath, setShowMissionPath] = useState(true);
  const [mapCenter, setMapCenter] = useState([18.5278859, 73.8522314]);
  const [mapZoom, setMapZoom] = useState(18);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State for map selector
  const [selectedMapType, setSelectedMapType] = useState(MAP_TYPES.OSM);
  
  const maxPathPoints = 100;
  const mapContainerRef = useRef(null);
  
  // Memoize the current position
  const dronePosition = useMemo(() =>
    [telemetryData.latitude, telemetryData.longitude],
    [telemetryData.latitude, telemetryData.longitude]
  );

  // Calculate optimal zoom level
  const calculateOptimalZoom = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return 18;
    if (coordinates.length === 1) return 19;

    const lats = coordinates.map(coord => coord[0]);
    const lngs = coordinates.map(coord => coord[1]);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff > 0.1) return 14;
    if (maxDiff > 0.05) return 15;
    if (maxDiff > 0.01) return 16;
    if (maxDiff > 0.005) return 17;
    return 18;
  };

  // Zoom handlers
  const handleDroneZoom = () => {
    if (dronePosition[0] !== 0 && dronePosition[1] !== 0) {
      setMapCenter(dronePosition);
      setMapZoom(19);
    }
  };

  const handleMissionZoom = () => {
    if (missionWaypoints.length > 0) {
      const coordinates = missionWaypoints.map(wp => [wp.lat, wp.lng]);
      setMapCenter(coordinates[0]);
      setMapZoom(calculateOptimalZoom(coordinates));
    }
  };

  // Toggle mission path
  const toggleMissionPath = () => {
    setShowMissionPath(prev => !prev);
  };

  // Clear mission path
  const clearMissionPath = () => {
    setMissionWaypoints([]);
    setShowMissionPath(false);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Set up telemetry subscriptions
  useEffect(() => {
    socketManager.connect();

    const handleTelemetry = (data) => {
      if (data) {
        setTelemetryData(prevData => ({
          ...prevData,
          ...data
        }));

        if (data.latitude !== 0 && data.longitude !== 0) {
          const newPosition = [data.latitude, data.longitude];
          setPathHistory(prev => {
            const newHistory = [...prev, newPosition];
            return newHistory.slice(-maxPathPoints);
          });
        }
      }
    };

    const handleCommandResponse = (data) => {
      if (data.command === 'update_mission_data' && data.waypoints) {
        console.log('Received waypoints:', data.waypoints);
        const waypoints = data.waypoints.map(wp => ({
          lat: parseFloat(wp.lat),
          lng: parseFloat(wp.lon),
          alt: parseFloat(wp.alt),
          seq: wp.seq
        }));

        setMissionWaypoints(waypoints);
        setShowMissionPath(true);
      }
    };

    const handleConnection = (data) => {
      setError(null);
      setTelemetryData(prev => ({
        ...prev,
        connected: data.status === 'connected'
      }));
    };

    socketManager.subscribe('telemetry', handleTelemetry);
    socketManager.subscribe('command_response', handleCommandResponse);
    socketManager.subscribe('connection', handleConnection);

    return () => {
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('command_response', handleCommandResponse);
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.disconnect();
    };
  }, []);

  // Handle waypoint store updates
  useEffect(() => {
    const handleWaypointsUpdate = (waypoints) => {
      setMissionWaypoints(waypoints);
      setShowMissionPath(true);

      if (waypoints.length > 0) {
        setMapZoom(18);
      }
    };

    waypointStore.addListener(handleWaypointsUpdate);

    const currentWaypoints = waypointStore.getWaypoints();
    if (currentWaypoints.length > 0) {
      handleWaypointsUpdate(currentWaypoints);
    }

    return () => {
      waypointStore.removeListener(handleWaypointsUpdate);
    };
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Handle escape key
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullscreen]);

  return (
    <div
      ref={mapContainerRef}
      className={`relative ${isFullscreen ? 'w-screen h-screen' : 'w-full h-[500px]'}`}
    >
      <style jsx global>{`
        .leaflet-container {
          background: #222 !important;
        }
        .map-tile {
          background-color: #222;
        }
      `}</style>
      {error && (
        <div className="absolute top-0 left-0 right-0 z-[2000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Map type selector */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2 rounded-md overflow-hidden shadow-lg border border-slate-600/50">
        {Object.values(MAP_TYPES).map(mapType => (
          <button
            key={mapType}
            onClick={() => setSelectedMapType(mapType)}
            className={`px-3 py-1.5 text-white text-sm font-medium transition-colors backdrop-blur-sm ${
              selectedMapType === mapType 
                ? 'bg-blue-600' 
                : 'bg-slate-800/90 hover:bg-slate-700/90'
            }`}
            style={{ borderWidth: '0px' }}
          >
            {mapType}
          </button>
        ))}
      </div>

      {/* Map container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={3}
        maxZoom={23}
        className="h-full w-full"
        whenReady={() => setIsLoading(false)}
        zoomAnimation={true}
        fadeAnimation={true}
      >
        <TileLayerSelector mapType={selectedMapType} />

        {dronePosition[0] !== 0 && dronePosition[1] !== 0 && (
          <Marker
            position={dronePosition}
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

        {showMissionPath && missionWaypoints.length > 0 && (
          <>
            {missionWaypoints.map((waypoint, index) => (
              <Marker
                key={index}
                position={[waypoint.lat, waypoint.lng]}
                icon={waypointIcon}
                zIndexOffset={1000 + index}
              >
                <Popup className="custom-popup">
                  <div className="text-sm font-sans">
                    <div className="font-bold mb-2 text-base">Waypoint {waypoint.seq}</div>
                    <div className="grid grid-cols-2 gap-1">
                      <span className="font-semibold">Latitude:</span>
                      <span>{waypoint.lat.toFixed(6)}°</span>
                      <span className="font-semibold">Longitude:</span>
                      <span>{waypoint.lng.toFixed(6)}°</span>
                      <span className="font-semibold">Altitude:</span>
                      <span>{waypoint.alt.toFixed(2)}m</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            <Polyline
              positions={missionWaypoints.map(wp => [wp.lat, wp.lng])}
              color="blue"
              weight={3}
              opacity={0.7}
              dashArray="5, 10"
            />
          </>
        )}

        {pathHistory.length > 1 && (
          <Polyline
            positions={pathHistory}
            color="red"
            weight={2}
            opacity={0.7}
          />
        )}

        <MapUpdater center={mapCenter} zoom={mapZoom} />
      </MapContainer>

      {/* Fullscreen toggle button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-20 left-4 z-[1000] px-4 py-2 bg-slate-800 text-white rounded-md shadow hover:bg-slate-700 transition-colors flex items-center gap-2 w-12 justify-center"
      >
        {isFullscreen ? (
          <span className="font-mono">[]</span>
        ) : (
          <span className="font-mono">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </span>
        )}
      </button>

      {/* Waypoint info */}
      <div className="absolute top-20 right-4 z-[1000] bg-white p-2 rounded shadow text-xs">
        Waypoints: {missionWaypoints.length} | Show Path: {showMissionPath ? 'Yes' : 'No'}
      </div>

      {/* Zoom control buttons */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleDroneZoom}
          className="px-4 py-2 bg-slate-800 text-white rounded-md shadow hover:bg-slate-700 transition-colors w-12 flex items-center justify-center"
          disabled={dronePosition[0] === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={handleMissionZoom}
          className="px-4 py-2 bg-slate-800 text-white rounded-md shadow hover:bg-slate-700 transition-colors w-12 flex items-center justify-center"
          disabled={missionWaypoints.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Existing control buttons */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {missionWaypoints.length > 0 && (
          <button
            onClick={toggleMissionPath}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors w-40"
          >
            {showMissionPath ? 'Hide Mission Path' : 'Show Mission Path'}
          </button>
        )}
        <button
          onClick={clearMissionPath}
          className="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition-colors w-40"
        >
          Clear Path
        </button>
      </div>

      {/* Status display */}
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

      <style jsx>{`
        .waypoint-marker {
          filter: hue-rotate(120deg);
          z-index: 1000 !important;
        }
      `}</style>
      <style jsx global>{`
    .marker-container {
        width: 40px;
        height: 40px;
        position: relative;
    }

    .center-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        background: #00ff00;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 10px #00ff00;
    }

    .ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 30px;
        height: 30px;
        border: 2px solid #00ff00;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.7;
    }

    .crosshair {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        transform: translate(-50%, -50%);
    }

    .crosshair:before, .crosshair:after {
        content: '';
        position: absolute;
        background: #00ff00;
        opacity: 0.7;
    }

    .crosshair:before {
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
    }

    .crosshair:after {
        left: 50%;
        top: 0;
        width: 1px;
        height: 100%;
    }

    .waypoint-container {
        width: 30px;
        height: 30px;
        position: relative;
    }

    .waypoint-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 6px;
        background: #ff3b30;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px #ff3b30;
    }

    .waypoint-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        border: 2px solid #ff3b30;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.7;
    }

    /* Popup styling */
    .custom-popup .leaflet-popup-content-wrapper {
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        border: 1px solid rgba(0, 255, 0, 0.3);
    }

    .custom-popup .leaflet-popup-tip {
        background: rgba(0, 0, 0, 0.8);
    }
`}</style>
    </div>
  );
};

export default DroneMap;