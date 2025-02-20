import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowUp, Clock, Download, MapPin, Plane, 
  RotateCcw, RotateCw, Route, Home, Circle, 
  Gauge, Save, Upload, X, Plus, Wind, Lock,
  Unlock, Move3d, ArrowUpDown, MoveHorizontal,
  Box, Maximize2, Minimize2, GripHorizontal
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Line, Html, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';

// Mission point type definitions
const MISSION_TYPES = {
    TAKEOFF: 'TAKEOFF',
    WAYPOINT: 'WAYPOINT',
    WAIT: 'WAIT',
    LAND: 'LAND',
    RTH: 'RETURN_TO_HOME',
    CIRCLE: 'CIRCLE_POINT',
    SPEED: 'SET_SPEED',
    SPEED_CHANGE: 'SPEED_CHANGE'
};

// Movement lock modes for 3D
const LOCK_MODES = {
    NONE: 'none',
    XY: 'xy',
    Z: 'z'
};

const DEFAULT_SPEED = 10;
const TAKEOFF_SPEED = 2;
const LANDING_SPEED = 1;

// Custom waypoint icon generator
const waypointIcon = (number) => L.divIcon({
    className: 'mission-waypoint-icon',
    html: `
        <div class='waypoint-container'>
            <div class='waypoint-dot'></div>
            <div class='waypoint-ring'></div>
            <div class='waypoint-number'>${number}</div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Helper function to calculate distance between coordinates
const calculateDistance = (lat1, lon1, alt1, lat2, lon2, alt2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const horizontalDist = R * c;
    const verticalDist = Math.abs(alt2 - alt1);
    
    return Math.sqrt(Math.pow(horizontalDist, 2) + Math.pow(verticalDist, 2));
};

// Helper function for 3D coordinate conversion
const gpsTo3D = (lat, lng, alt, mapCenter) => {
    const x = (lng - mapCenter[1]) * 100000;
    const z = (lat - mapCenter[0]) * 100000;
    const y = alt * 10;
    return [x, y, z];
};

// Helper function for 3D to GPS conversion
const threeDToGPS = (x, y, z, mapCenter) => {
    const lat = (z / 100000) + mapCenter[0];
    const lng = (x / 100000) + mapCenter[1];
    const alt = y / 10;
    return { lat, lng, alt };
};

// Helper for calculating new position in 3D space
const calculateNewPosition = (raycaster, camera, movementPlane, point) => {
    const plane = new THREE.Plane();
    const planeNormal = new THREE.Vector3();

    switch(movementPlane) {
        case LOCK_MODES.XY:
            planeNormal.set(0, 1, 0);
            break;
        case LOCK_MODES.Z:
            planeNormal.copy(camera.position).normalize();
            planeNormal.y = 0;
            break;
        default:
            planeNormal.copy(camera.position).normalize();
    }

    plane.setFromNormalAndCoplanarPoint(
        planeNormal,
        new THREE.Vector3(point.x, point.y, point.z)
    );

    const intersection = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, intersection);
};

// Map click event handler
const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        }
    });
    return null;
};
// Ground plane component with map texture
const GroundPlane = ({ mapCenter }) => {
    const mapTexture = useLoader(TextureLoader, 
        `https://tile.openstreetmap.org/18/${Math.floor(mapCenter[0])}/${Math.floor(mapCenter[1])}.png`
    );

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshStandardMaterial map={mapTexture} opacity={0.8} transparent />
        </mesh>
    );
};

// Draggable point component with hover info
const DraggablePoint = ({ position, index, info, onDrag, lockMode }) => {
    const [hovered, setHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const mesh = useRef();
    const { camera, raycaster } = useThree();

    const handleDrag = useCallback((e) => {
        if (!mesh.current || !isDragging) return;

        const intersection = calculateNewPosition(
            raycaster, 
            camera, 
            lockMode, 
            mesh.current.position
        );

        if (intersection) {
            const gpsCoords = threeDToGPS(
                intersection.x,
                lockMode === LOCK_MODES.Z ? mesh.current.position.y : intersection.y,
                intersection.z,
                info.mapCenter
            );
            onDrag(index, gpsCoords);
        }
    }, [lockMode, camera, raycaster, index, info.mapCenter, onDrag, isDragging]);

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (isDragging) {
                handleDrag(e);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, [isDragging, handleDrag]);

    return (
        <group position={position}>
            {/* Waypoint Sphere */}
            <mesh
                ref={mesh}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHovered(false);
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    setIsDragging(false);
                }}
            >
                <sphereGeometry args={[2]} />
                <meshStandardMaterial 
                    color={isDragging ? "#22c55e" : hovered ? "#3b82f6" : "#ef4444"} 
                    emissive={hovered ? "#1e40af" : "#7f1d1d"}
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Waypoint Number */}
            <Text
                position={[0, 5, 0]}
                fontSize={4}
                color="white"
                backgroundColor="#00000080"
                padding={1.5}
                anchorX="center"
                anchorY="middle"
            >
                {index + 1}
            </Text>

    

            {/* Information Tooltip */}
            {hovered && (
                <Html distanceFactor={10}>
                    <div className="bg-slate-800/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-700/50">
                        <div className="font-medium mb-1">Waypoint {index + 1}</div>
                        <div className="grid grid-cols-2 gap-x-3 text-xs">
                            <span className="text-slate-400">Lat:</span>
                            <span>{info.lat.toFixed(6)}°</span>
                            <span className="text-slate-400">Lng:</span>
                            <span>{info.lng.toFixed(6)}°</span>
                            <span className="text-slate-400">Alt:</span>
                            <span>{info.alt}m</span>
                            {info.speed && (
                                <>
                                    <span className="text-slate-400">Speed:</span>
                                    <span>{info.speed}m/s</span>
                                </>
                            )}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};

// Lock mode controls UI
const LockModeControls = ({ lockMode, setLockMode }) => (
    <div className="absolute top-16 left-4 z-[1000] flex flex-col gap-2 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700/50">
        <button
            onClick={() => setLockMode(LOCK_MODES.NONE)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.NONE ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <Move3d className="w-4 h-4" />
            <span>Free Move</span>
        </button>
        <button
            onClick={() => setLockMode(LOCK_MODES.XY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.XY ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <ArrowUpDown className="w-4 h-4" />
            <span>Altitude Only</span>
        </button>
        <button
            onClick={() => setLockMode(LOCK_MODES.Z)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.Z ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <MoveHorizontal className="w-4 h-4" />
            <span>Horizontal Only</span>
        </button>
    </div>
);

// Main Mission3DView component
const Mission3DView = ({ mission, mapCenter, onPointDrag }) => {
    const [lockMode, setLockMode] = useState(LOCK_MODES.NONE);

    const points = useMemo(() => {
        return mission
            .filter(point => point.type === MISSION_TYPES.WAYPOINT)
            .map(point => gpsTo3D(point.lat, point.lng, point.alt, mapCenter));
    }, [mission, mapCenter]);

    return (
        <>
            <Canvas camera={{ position: [100, 100, 100], fov: 50 }}>
                <color attach="background" args={['#0f172a']} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                
                <GroundPlane mapCenter={mapCenter} />
                
                <Grid
                    args={[1000, 100]}
                    position={[0, 0, 0]}
                    cellColor="#334155"
                    sectionColor="#475569"
                    fadeDistance={1000}
                    fadeStrength={1}
                />
                
                {points.length > 1 && (
                    <Line
                        points={points}
                        color="#3b82f6"
                        lineWidth={2}
                        dashed={false}
                    />
                )}
                
                {points.map((point, index) => (
                    <DraggablePoint
                        key={index}
                        position={point}
                        index={index}
                        info={{
                            ...mission[index],
                            mapCenter
                        }}
                        onDrag={onPointDrag}
                        lockMode={lockMode}
                    />
                ))}
                
                <OrbitControls
                 enablePan={true}
                 enableZoom={true}
                 enableRotate={true}
                 mouseButtons={{
                  LEFT: undefined,
                  MIDDLE: THREE.MOUSE.ROTATE,
                  RIGHT: THREE.MOUSE.PAN
                 }}
                 makeDefault
                />
            </Canvas>
            
            <LockModeControls 
                lockMode={lockMode}
                setLockMode={setLockMode}
            />
            
            <div className="absolute bottom-4 left-4 z-[1000] px-3 py-2 bg-slate-800/90 backdrop-blur-sm text-white/90 rounded-lg border border-slate-700/50 text-sm">
                <div className="font-medium mb-1">3D Controls</div>
                <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-400">
                    <span>Left Click + Drag</span>
                    <span>Rotate View</span>
                    <span>Right Click + Drag</span>
                    <span>Pan View</span>
                    <span>Scroll Wheel</span>
                    <span>Zoom In/Out</span>
                </div>
            </div>
        </>
    );
};
const MissionPlanningMap = () => {
    // States
    const [mapCenter] = useState([18.5278859, 73.8522314]);
    const [mission, setMission] = useState([]);
    const [selectedAltitude, setSelectedAltitude] = useState(5);
    const [waitTime, setWaitTime] = useState(5);
    const [isAddingWaypoints, setIsAddingWaypoints] = useState(false);
    const [speedSetting, setSpeedSetting] = useState(10);
    const [circleRadius, setCircleRadius] = useState(10);
    const [circleTurns, setCircleTurns] = useState(1);
    const [defaultSpeed, setDefaultSpeed] = useState(10);
    const [globalAltitude, setGlobalAltitude] = useState(5);
    const [is3DMode, setIs3DMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lockMode, setLockMode] = useState('none');
    const missionListRef = useRef(null);

    const mapProps = {
        center: mapCenter,
        zoom: 18,
        className: "h-full w-full"
    };

    // Mission Handlers
    const validateMission = () => {
        if (mission.length === 0) return "Mission cannot be empty";
        if (mission[0]?.type !== MISSION_TYPES.TAKEOFF) return 'Mission must start with takeoff';
        if (![MISSION_TYPES.LAND, MISSION_TYPES.RTH].includes(mission[mission.length - 1]?.type)) {
            return 'Mission must end with land or return to home';
        }
        return null;
    };

    const calculateMissionStats = () => {
        let totalDistance = 0;
        let totalTime = 0;
        let currentAlt = 0;
        let currentSpeed = DEFAULT_SPEED;
        let prevPoint = null;

        mission.forEach((point) => {
            if (point.type === MISSION_TYPES.SPEED_CHANGE) {
                currentSpeed = point.speed;
                return;
            }

            if (point.type === MISSION_TYPES.TAKEOFF) {
                currentAlt = point.alt;
                const takeoffTime = currentAlt / TAKEOFF_SPEED;
                totalTime += takeoffTime;
                totalDistance += currentAlt;
                prevPoint = {
                    lat: mapCenter[0],
                    lng: mapCenter[1],
                    alt: currentAlt
                };
            }

            if (point.type === MISSION_TYPES.WAYPOINT && prevPoint) {
                const distance = calculateDistance(
                    prevPoint.lat, prevPoint.lng, prevPoint.alt,
                    point.lat, point.lng, point.alt
                );
                totalDistance += distance;
                totalTime += distance / currentSpeed;
                
                // Add hover time if specified
                if (point.hoverTime) {
                    totalTime += point.hoverTime;
                }
                
                prevPoint = point;
            }

            if (point.type === MISSION_TYPES.WAIT) {
                totalTime += point.duration;
            }

            if (point.type === MISSION_TYPES.LAND) {
                const landingDist = currentAlt;
                totalDistance += landingDist;
                totalTime += landingDist / LANDING_SPEED;
            }
        });

        return {
            distance: totalDistance.toFixed(2),
            time: totalTime.toFixed(2)
        };
    };

    const generateMissionFile = () => {
        const validationError = validateMission();
        if (validationError) {
            alert(validationError);
            return;
        }

        let fileContent = 'QGC WPL 110\n';
        let currentSpeed = DEFAULT_SPEED;
        
        // Home position
        fileContent += `0\t1\t0\t16\t0\t0\t0\t0\t${mapCenter[0]}\t${mapCenter[1]}\t${selectedAltitude}\t1\n`;
        
        mission.forEach((point, index) => {
            const seq = index + 1;
            switch (point.type) {
                case MISSION_TYPES.SPEED_CHANGE:
                    currentSpeed = point.speed;
                    fileContent += `${seq}\t0\t3\t178\t${currentSpeed}\t${currentSpeed}\t0\t0\t0\t0\t0\t1\n`;
                    break;
                case MISSION_TYPES.WAYPOINT:
                    fileContent += `${seq}\t0\t3\t16\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t${point.lat}\t${point.lng}\t${point.alt}\t${currentSpeed}\n`;
                    break;
                case MISSION_TYPES.TAKEOFF:
                    fileContent += `${seq}\t0\t3\t22\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t${point.lat}\t${point.lng}\t${point.alt}\t1\n`;
                    break;
                case MISSION_TYPES.WAIT:
                    fileContent += `${seq}\t0\t3\t19\t${point.duration}\t0\t0\t0\t0\t0\t0\t1\n`;
                    break;
                case MISSION_TYPES.LAND:
                    fileContent += `${seq}\t0\t3\t21\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.000000\t1\n`;
                    break;
                case MISSION_TYPES.RTH:
                    fileContent += `${seq}\t0\t3\t20\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.00000000\t0.000000\t1\n`;
                    break;
                case MISSION_TYPES.CIRCLE:
                    fileContent += `${seq}\t0\t3\t18\t${point.radius}\t${point.turns}\t1\t0\t${point.lat}\t${point.lng}\t${selectedAltitude}\t1\n`;
                    break;
                default:
                    break;
            }
        });

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mission.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Waypoint Handlers
    const addWaypoint = (data) => {
        const newItem = {
            ...data,
            id: `item-${Date.now()}`,
            seq: mission.length
        };
        setMission(prev => [...prev, newItem]);
    };

    const handleMapClick = (latlng) => {
        if (!isAddingWaypoints) return;
        
        const newPoint = {
            type: MISSION_TYPES.WAYPOINT,
            lat: latlng.lat,
            lng: latlng.lng,
            alt: selectedAltitude,
            speed: defaultSpeed,
            seq: mission.length
        };
        addWaypoint(newPoint);
    };

    const handleWaypointDrag = (index, newPosition) => {
        setMission(prev => prev.map((point, i) => {
            if (i === index && point.type === MISSION_TYPES.WAYPOINT) {
                return {
                    ...point,
                    lat: newPosition.lat,
                    lng: newPosition.lng
                };
            }
            return point;
        }));
    };

    const handle3DPointDrag = (index, newPosition) => {
        setMission(prev => prev.map((point, i) => {
            if (i === index && point.type === MISSION_TYPES.WAYPOINT) {
                return {
                    ...point,
                    lat: newPosition.lat,
                    lng: newPosition.lng,
                    alt: lockMode === 'z' ? point.alt : newPosition.alt
                };
            }
            return point;
        }));
    };

    // Continue in Part 4...
    // Command Handlers
    const addCommand = (type) => {
        switch (type) {
            case MISSION_TYPES.TAKEOFF:
                addWaypoint({
                    type: MISSION_TYPES.TAKEOFF,
                    alt: selectedAltitude,
                    lat: mapCenter[0],
                    lng: mapCenter[1]
                });
                break;
            case MISSION_TYPES.WAIT:
                addWaypoint({
                    type: MISSION_TYPES.WAIT,
                    duration: waitTime
                });
                break;
            case MISSION_TYPES.LAND:
                addWaypoint({
                    type: MISSION_TYPES.LAND
                });
                break;
            case MISSION_TYPES.RTH:
                addWaypoint({
                    type: MISSION_TYPES.RTH
                });
                break;
            case MISSION_TYPES.CIRCLE:
                addWaypoint({
                    type: MISSION_TYPES.CIRCLE,
                    radius: circleRadius,
                    turns: circleTurns
                });
                break;
            case MISSION_TYPES.SPEED:
                addSpeedChange(speedSetting);
                break;
            default:
                return;
        }
    };

    const addSpeedChange = (newSpeed) => {
        setDefaultSpeed(newSpeed);
        addWaypoint({
            type: MISSION_TYPES.SPEED_CHANGE,
            speed: newSpeed
        });
    };

    const removeMissionPoint = (index) => {
        setMission(prev => {
            const newMission = prev.filter((_, i) => i !== index);
            return newMission.map((point, i) => ({ ...point, seq: i }));
        });
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const reorderedMission = Array.from(mission);
        const [movedItem] = reorderedMission.splice(result.source.index, 1);
        reorderedMission.splice(result.destination.index, 0, movedItem);
        const updatedMission = reorderedMission.map((item, index) => ({
            ...item,
            seq: index
        }));
        
        setMission(updatedMission);
        };
        
        const handleWaypointAltitudeChange = (index, newAltitude) => {
            setMission(prevMission => prevMission.map((point, i) => {
                if (i === index && point.type === MISSION_TYPES.WAYPOINT) {
                    return { ...point, alt: Number(newAltitude) };
                }
                return point;
            }));
        };
        
        const updateAllAltitudes = () => {
            setMission(prev => prev.map(item => {
                if (item.type === MISSION_TYPES.WAYPOINT) {
                    return { ...item, alt: globalAltitude };
                }
                return item;
            }));
        };
        
        // View Controls
        const toggle3DMode = () => {
            setIs3DMode(!is3DMode);
        };
        
        const toggleFullscreen = () => {
            const element = document.querySelector('.map-container');
            
            if (!isFullscreen) {
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        };
        
    const missionStats = calculateMissionStats();

    return (
        <div className="flex flex-col gap-4 text-white">
            {/* Main Content: Map and Mission List */}
            <div className="flex gap-4">
                {/* Left: Map */}
                <div className="w-2/3">
                    <div className="relative h-[500px] border border-slate-700 rounded-lg overflow-hidden">
                        {is3DMode ? (
                            <Mission3DView 
                                mission={mission} 
                                mapCenter={mapCenter}
                                onPointDrag={handle3DPointDrag}
                                lockMode={lockMode}
                            />
                        ) : (
                            <MapContainer
                            center={mapCenter}
                            zoom={18}
                            className="h-full w-full z-0"
                            doubleClickZoom={false}
                        >
                                                        <TileLayer
                                                            attribution='© OpenStreetMap contributors'
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                        />
                                <MapEvents onMapClick={handleMapClick} />
                                <Polyline
                                    positions={mission
                                        .filter(point => point.type === MISSION_TYPES.WAYPOINT)
                                        .map(point => [point.lat, point.lng])}
                                    color="#3b82f6"
                                    weight={3}
                                    dashArray="5, 10"
                                    opacity={0.8}
                                />
                                {mission.map((point, index) => (
                                    point.type === MISSION_TYPES.WAYPOINT && (
                                        <Marker
                                            key={index}
                                            position={[point.lat, point.lng]}
                                            icon={waypointIcon(index + 1)}
                                            draggable={true}
                                            eventHandlers={{
                                                dragstart: (e) => {
                                                    e.target.getElement().style.cursor = 'grabbing';
                                                },
                                                dragend: (e) => {
                                                    const marker = e.target;
                                                    const position = marker.getLatLng();
                                                    handleWaypointDrag(index, position);
                                                    e.target.getElement().style.cursor = '';
                                                }
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-sm">
                                                    <div>Waypoint {index + 1}</div>
                                                    <div>Altitude: {point.alt}m</div>
                                                    <div>Lat: {point.lat.toFixed(7)}</div>
                                                    <div>Lng: {point.lng.toFixed(7)}</div>
                                                    {point.speed && (
                                                        <div>Speed: {point.speed}m/s</div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </MapContainer>
                        )}
                        
                        {/* View Controls */}
                        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
                            <button
                                onClick={toggle3DMode}
                                className="px-3 py-1.5 bg-slate-800/90 text-white/90 rounded-md hover:bg-slate-700/90 flex items-center gap-2 backdrop-blur-sm border border-slate-700/50"
                            >
                                {is3DMode ? '2D View' : '3D View'}
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="p-1.5 bg-slate-800/90 text-white/90 rounded-md hover:bg-slate-700/90 backdrop-blur-sm border border-slate-700/50"
                            >
                                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                        </div>

                        {/* Mission Info */}
                        <div className="absolute top-4 left-4 z-[1000] bg-slate-800/90 px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-700/50">
                            <div className="text-sm font-medium text-white/90">Mission Info</div>
                            <div className="text-xs text-white/60 mt-1">
                                <div>Distance: {missionStats.distance}m</div>
                                <div>Est. Time: {missionStats.time}s</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Continue with Mission Sequence and Control Panels... */}
{/* Right: Mission Sequence */}
<div className="w-1/3">
                    <div className="h-[500px] bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
                        <div 
                            ref={missionListRef} 
                            className="h-full overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white/80 text-sm font-medium">Mission Sequence</h3>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <span>{mission.length} commands</span>
                                    <span>•</span>
                                    <span>Distance: {missionStats.distance}m</span>
                                    <span>•</span>
                                    <span>Time: {missionStats.time}s</span>
                                </div>
                            </div>

                            {/* Global Altitude Control */}
                            <div className="flex items-center gap-2 mb-3 p-2 bg-slate-700/50 rounded">
                                <input
                                    type="number"
                                    value={globalAltitude}
                                    onChange={(e) => setGlobalAltitude(Number(e.target.value))}
                                    className="w-20 px-2 py-1 bg-slate-600/50 rounded text-white/90"
                                    placeholder="Alt (m)"
                                    min="0"
                                    step="0.1"
                                />
                                <button
                                    onClick={updateAllAltitudes}
                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                                >
                                    Update All
                                </button>
                            </div>

                            {/* Mission List */}
                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Droppable droppableId="mission-sequence">
                                    {(provided) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex flex-col gap-2"
                                        >
                                            {mission.map((point, index) => (
                                                <Draggable
                                                    key={`${point.type}-${index}`}
                                                    draggableId={`${point.type}-${index}`}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`
                                                                flex items-center justify-between gap-2 p-2 rounded-md
                                                                ${snapshot.isDragging ? 'bg-slate-700' : 'bg-slate-800/50'}
                                                                border border-slate-700
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3 text-sm text-white/80">
                                                                <GripHorizontal className="w-4 h-4 text-slate-500" />
                                                                <span className="text-xs text-white/40 font-mono">{index + 1}</span>
                                                                {point.type === MISSION_TYPES.TAKEOFF && (
                                                                    <>
                                                                        <Plane className="w-3.5 h-3.5 text-blue-400" />
                                                                        <span>Takeoff to {point.alt}m</span>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.WAYPOINT && (
                                                                    <>
                                                                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                                                                        <div className="flex items-center gap-2">
                                                                            <span>Waypoint ({point.lat.toFixed(6)}, {point.lng.toFixed(6)})</span>
                                                                            <input
                                                                                type="number"
                                                                                value={point.alt}
                                                                                onChange={(e) => handleWaypointAltitudeChange(index, e.target.value)}
                                                                                className="w-16 px-2 py-0.5 bg-slate-700/50 rounded text-white/90 text-xs"
                                                                                min="0"
                                                                                step="0.1"
                                                                            />
                                                                            <span className="text-xs text-slate-400">m</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.WAIT && (
                                                                    <>
                                                                        <Clock className="w-3.5 h-3.5 text-yellow-400" />
                                                                        <span>Wait {point.duration}s</span>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.LAND && (
                                                                    <>
                                                                        <Home className="w-3.5 h-3.5 text-green-400" />
                                                                        <span>Land</span>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.RTH && (
                                                                    <>
                                                                        <Route className="w-3.5 h-3.5 text-purple-400" />
                                                                        <span>Return to Home</span>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.CIRCLE && (
                                                                    <>
                                                                        <Circle className="w-3.5 h-3.5 text-teal-400" />
                                                                        <span>Circle {point.radius}m radius, {point.turns} turns</span>
                                                                    </>
                                                                )}
                                                                {point.type === MISSION_TYPES.SPEED_CHANGE && (
                                                                    <>
                                                                        <Wind className="w-3.5 h-3.5 text-sky-400" />
                                                                        <span>Set speed to {point.speed}m/s</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => removeMissionPoint(index)}
                                                                className="text-red-400 hover:text-red-300 p-1"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="grid grid-cols-3 gap-3">
                {/* Flight Commands */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
                    <h3 className="text-white/80 text-sm font-medium mb-3">Flight Commands</h3>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => addCommand(MISSION_TYPES.TAKEOFF)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Plane className="w-3.5 h-3.5" />
                            <span>Takeoff</span>
                            <input
                                type="number"
                                value={selectedAltitude}
                                onChange={(e) => setSelectedAltitude(Number(e.target.value))}
                                className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                                placeholder="Alt (m)"
                                min="0"
                                step="0.1"
                            />
                        </button>
                        <button
                            onClick={() => addCommand(MISSION_TYPES.LAND)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Home className="w-3.5 h-3.5" />
                            <span>Land</span>
                        </button>
                        <button
                            onClick={() => addCommand(MISSION_TYPES.RTH)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Route className="w-3.5 h-3.5" />
                            <span>Return to Home</span>
                        </button>
                    </div>
                </div>

                {/* Waypoint Controls */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
                    <h3 className="text-white/80 text-sm font-medium mb-3">Waypoint Controls</h3>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setIsAddingWaypoints(!isAddingWaypoints)}
                            className={`flex items-center text-sm gap-2 px-3 py-1.5 ${
                                isAddingWaypoints ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-white/90'
                            } hover:bg-slate-700 rounded-md transition-colors`}
                        >
                            <MapPin className="w-3.5 h-3.5" />
                            {isAddingWaypoints ? 'Adding Waypoints' : 'Add Waypoints'}
                        </button>
                        <button
                            onClick={() => addCommand(MISSION_TYPES.CIRCLE)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Circle className="w-3.5 h-3.5" />
                            <span>Circle Mode</span>
                            <div className="ml-auto flex items-center gap-2">
                                <input
                                    type="number"
                                    value={circleRadius}
                                    onChange={(e) => setCircleRadius(Number(e.target.value))}
                                    className="w-16 px-2 py-0.5 text-xs rounded bg-slate-600/50 text-white/90"
                                    placeholder="Radius (m)"
                                    min="0"
                                />
                                <input
                                    type="number"
                                    value={circleTurns}
                                    onChange={(e) => setCircleTurns(Number(e.target.value))}
                                    className="w-16 px-2 py-0.5 text-xs rounded bg-slate-600/50 text-white/90"
                                    placeholder="Turns"
                                    min="1"
                                />
                            </div>
                        </button>
                        <button
                            onClick={() => addCommand(MISSION_TYPES.WAIT)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Hold Position</span>
                            <input
                                type="number"
                                value={waitTime}
                                onChange={(e) => setWaitTime(Number(e.target.value))}
                                className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                                placeholder="Time (s)"
                                min="0"
                            />
                        </button>
                    </div>
                </div>

                {/* Mission Settings */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
                    <h3 className="text-white/80 text-sm font-medium mb-3">Mission Settings</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 rounded-md">
                            <Gauge className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-white/80">Speed</span>
                            <input
                                type="number"
                                value={speedSetting}
                                onChange={(e) => setSpeedSetting(Number(e.target.value))}
                                className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                                placeholder="m/s"
                                min="0"
                            />
                        </div>
                        <button
                            onClick={() => addSpeedChange(speedSetting)}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                        >
                            <Wind className="w-3.5 h-3.5" />
                            <span>Set Speed</span>
                        </button>
                        <button
                            onClick={generateMissionFile}
                            className="flex items-center text-sm gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                          <span>Download Mission</span>
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                }

                .mission-waypoint-icon .waypoint-container {
                    width: 30px;
                    height: 30px;
                    position: relative;
                }

                .mission-waypoint-icon .waypoint-dot {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 6px;
                    height: 6px;
                    background: #ef4444;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 8px #ef4444;
                }

                .mission-waypoint-icon .waypoint-ring {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #ef4444;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0.7;
                }

                .mission-waypoint-icon .waypoint-number {
                    position: absolute;
                    top: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .mission-waypoint-icon .waypoint-container:hover .waypoint-number {
                    background: rgba(0, 0, 0, 0.9);
                }

                /* Animation for transitions */
                .fade-enter {
                    opacity: 0;
                }
                .fade-enter-active {
                    opacity: 1;
                    transition: opacity 300ms ease-in;
                }
                .fade-exit {
                    opacity: 1;
                }
                .fade-exit-active {
                    opacity: 0;
                    transition: opacity 300ms ease-in;
                }
            `}</style>
        </div>
    );
};

export default MissionPlanningMap;