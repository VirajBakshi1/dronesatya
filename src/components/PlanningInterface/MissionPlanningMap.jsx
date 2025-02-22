// src/components/PlanningInterface/MissionPlanningMap.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { MapView } from './Map2D/MapView';
import { Mission3DView } from './Map3D/Mission3DView';
import { MissionList } from './MissionList/MissionList';
import { FlightCommands } from './Controls/FlightCommands';
import { WaypointControls } from './Controls/WaypointControls';
import { MissionSettings } from './Controls/MissionSettings';
import { MISSION_TYPES } from './missionConstants';
import * as Cesium from '@cesium/engine';

const MissionPlanningMap = () => {
    // Core States
    const [mapCenter] = useState([18.5278859, 73.8522314]);
    const [mission, setMission] = useState([]);
    const [isAddingWaypoints, setIsAddingWaypoints] = useState(false);
    const [is3DMode, setIs3DMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const missionListRef = useRef(null);

    // Mission Settings States
    const [selectedAltitude, setSelectedAltitude] = useState(5);
    const [waitTime, setWaitTime] = useState(5);
    const [speedSetting, setSpeedSetting] = useState(10);
    const [circleRadius, setCircleRadius] = useState(10);
    const [circleTurns, setCircleTurns] = useState(1);
    const [defaultSpeed, setDefaultSpeed] = useState(10);
    const [globalAltitude, setGlobalAltitude] = useState(5);

    // Mission Validation
    const validateMission = () => {
        if (mission.length === 0) return "Mission cannot be empty";
        if (mission[0]?.type !== MISSION_TYPES.TAKEOFF) return 'Mission must start with takeoff';
        if (![MISSION_TYPES.LAND, MISSION_TYPES.RTH].includes(mission[mission.length - 1]?.type)) {
            return 'Mission must end with land or return to home';
        }
        return null;
    };

    // Distance Calculation using Cesium
    const calculateDistance = (lat1, lon1, alt1, lat2, lon2, alt2) => {
        const point1 = Cesium.Cartesian3.fromDegrees(lon1, lat1, alt1);
        const point2 = Cesium.Cartesian3.fromDegrees(lon2, lat2, alt2);
        return Cesium.Cartesian3.distance(point1, point2);
    };

    // Mission Statistics Calculation
    const calculateMissionStats = () => {
        let totalDistance = 0;
        let totalTime = 0;
        let currentAlt = 0;
        let currentSpeed = 10;
        let prevPoint = null;

        mission.forEach((point) => {
            if (point.type === MISSION_TYPES.SPEED_CHANGE) {
                currentSpeed = point.speed;
                return;
            }

            if (point.type === MISSION_TYPES.TAKEOFF) {
                currentAlt = point.alt;
                const takeoffTime = currentAlt / 2;
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
                totalTime += landingDist;
            }
        });

        return {
            distance: totalDistance.toFixed(2),
            time: totalTime.toFixed(2)
        };
    };

    // Mission Modification Handlers
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
                    lng: newPosition.lng,
                    ...(newPosition.alt !== undefined && { alt: newPosition.alt })
                };
            }
            return point;
        }));
    };

    // Add missing handlers
    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const reorderedMission = Array.from(mission);
        const [movedItem] = reorderedMission.splice(result.source.index, 1);
        reorderedMission.splice(result.destination.index, 0, movedItem);

        setMission(reorderedMission.map((item, index) => ({
            ...item,
            seq: index
        })));
    };

    const handleWaypointAltitudeChange = (index, newAltitude) => {
        setMission(prev => prev.map((point, i) => {
            if (i === index && point.type === MISSION_TYPES.WAYPOINT) {
                return { ...point, alt: Number(newAltitude) };
            }
            return point;
        }));
    };

    const removeMissionPoint = (index) => {
        setMission(prev => {
            const newMission = prev.filter((_, i) => i !== index);
            return newMission.map((point, i) => ({ ...point, seq: i }));
        });
    };

    const updateAllAltitudes = () => {
        setMission(prev => prev.map(item => {
            if (item.type === MISSION_TYPES.WAYPOINT) {
                return { ...item, alt: globalAltitude };
            }
            return item;
        }));
    };

    // Mission Commands
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

    // File Generation
    const generateMissionFile = () => {
        const validationError = validateMission();
        if (validationError) {
            alert(validationError);
            return;
        }

        let fileContent = 'QGC WPL 110\n';
        let currentSpeed = defaultSpeed;

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

    // Fullscreen handling
    const toggleFullscreen = () => {
        const element = document.getElementById('map-container');
        try {
            if (!document.fullscreenElement) {
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Calculate mission stats
    const missionStats = calculateMissionStats();

    // View Controls
    const toggle3DMode = () => setIs3DMode(!is3DMode);

    return (
        <div className="flex flex-col gap-4 text-white">
            <div className="flex gap-4">
                <div className="w-2/3">
                    <div className="relative h-[500px] border border-slate-700 rounded-lg overflow-hidden map-container" id="map-container">
                        {is3DMode ? (
                            <Mission3DView
                                mission={mission}
                                mapCenter={mapCenter}
                                onPointDrag={handleWaypointDrag}
                                isAddingWaypoints={isAddingWaypoints}
                                handleMapClick={handleMapClick}
                            />
                        ) : (
                            <MapView
                                mapCenter={mapCenter}
                                mission={mission}
                                handleMapClick={handleMapClick}
                                handleWaypointDrag={handleWaypointDrag}
                            />
                        )}

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

                        <div className="absolute top-4 left-4 z-[1000] bg-slate-800/90 px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-700/50">
                            <div className="text-sm font-medium text-white/90">Mission Info</div>
                            <div className="text-xs text-white/60 mt-1">
                                <div>Distance: {missionStats.distance}m</div>
                                <div>Est. Time: {missionStats.time}s</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-1/3">
                    <MissionList
                        mission={mission}
                        handleDragEnd={handleDragEnd}
                        handleWaypointAltitudeChange={handleWaypointAltitudeChange}
                        removeMissionPoint={removeMissionPoint}
                        globalAltitude={globalAltitude}
                        setGlobalAltitude={setGlobalAltitude}
                        updateAllAltitudes={updateAllAltitudes}
                        missionStats={missionStats}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <FlightCommands
                    addCommand={addCommand}
                    selectedAltitude={selectedAltitude}
                    setSelectedAltitude={setSelectedAltitude}
                />
                <WaypointControls
                    isAddingWaypoints={isAddingWaypoints}
                    setIsAddingWaypoints={setIsAddingWaypoints}
                    addCommand={addCommand}
                    circleRadius={circleRadius}
                    setCircleRadius={setCircleRadius}
                    circleTurns={circleTurns}
                    setCircleTurns={setCircleTurns}
                    waitTime={waitTime}
                    setWaitTime={setWaitTime}
                />
                <MissionSettings
                    speedSetting={speedSetting}
                    setSpeedSetting={setSpeedSetting}
                    addSpeedChange={addSpeedChange}
                    generateMissionFile={generateMissionFile}
                />
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

                .map-container {
                    transition: all 0.3s ease;
                }

                .map-container:fullscreen {
                    padding: 0;
                    width: 100vw;
                    height: 100vh;
                }

                .map-container:-webkit-full-screen {
                    padding: 0;
                    width: 100vw;
                    height: 100vh;
                }

                .map-container:-ms-fullscreen {
                    padding: 0;
                    width: 100vw;
                    height: 100vh;
                }
            `}</style>
        </div>
    );
};

export default MissionPlanningMap;
                                