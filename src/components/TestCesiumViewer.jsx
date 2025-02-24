import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

// Assign Cesium to the window object for global access if needed
window.Cesium = Cesium;

const TestCesiumViewer = () => {
    const cesiumContainer = useRef(null);
    const viewer = useRef(null);
    const [missionMode, setMissionMode] = useState(false);
    const [waypoints, setWaypoints] = useState([]);

    useEffect(() => {
        if (!cesiumContainer.current) return;

        // Initialize Cesium Viewer
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
            baseLayerPicker: true,
            geocoder: true,
            homeButton: true,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false, // No animation widget
            timeline: false,  // No timeline widget
            fullscreenButton: true,
            scene3DOnly: true,
            terrainExaggeration: 1.5
        });

        viewer.current.scene.globe.enableLighting = true;

        // Set initial camera view
        viewer.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(73.8567, 18.5204, 5000),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-25),
                roll: 0.0
            }
        });

        // Set up event handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);

        let selectedEntity = null;
        let dragging = false;
        let startMousePosition = null;
        let startWaypointPosition = null;

        // Add waypoints on left-click when in mission mode
        handler.setInputAction((click) => {
            if (!missionMode) return;

            const position = viewer.current.scene.globe.pick(viewer.current.camera.getPickRay(click.position), viewer.current.scene);
            if (position) {
                const cartographic = Cesium.Cartographic.fromCartesian(position);
                const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = Cesium.Math.toDegrees(cartographic.latitude);
                const height = cartographic.height + 42; // Default AGL of 42 meters

                const waypoint = {
                    id: Date.now(),
                    longitude,
                    latitude,
                    height,
                    position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
                };

                setWaypoints(prev => [...prev, waypoint]);
                addWaypointEntity(waypoint);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Start dragging on left-down
        handler.setInputAction((movement) => {
            const pickedObject = viewer.current.scene.pick(movement.position);
            if (Cesium.defined(pickedObject) && pickedObject.id && waypoints.some(wp => wp.id === pickedObject.id.id)) {
                selectedEntity = pickedObject.id;
                dragging = true;
                startMousePosition = movement.position.clone();
                startWaypointPosition = selectedEntity.position.getValue(viewer.current.clock.currentTime).clone();
                // Disable camera rotation during dragging
                viewer.current.scene.screenSpaceCameraController.enableRotate = false;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        // Drag waypoints horizontally on mouse move
        handler.setInputAction((movement) => {
            if (dragging && selectedEntity) {
                const deltaX = movement.endPosition.x - startMousePosition.x;
                const deltaY = movement.endPosition.y - startMousePosition.y;
                const startCartographic = Cesium.Cartographic.fromCartesian(startWaypointPosition);
                // Approximate scaling based on camera height
                const lonDelta = (deltaX * 0.0001); // Fine-tune this value for sensitivity
                const latDelta = (deltaY * 0.0001);
                const newLon = Cesium.Math.toDegrees(startCartographic.longitude) + lonDelta;
                const newLat = Cesium.Math.toDegrees(startCartographic.latitude) - latDelta;
                const newPosition = Cesium.Cartesian3.fromDegrees(newLon, newLat, startCartographic.height);
                selectedEntity.position.setValue(newPosition);

                // Update waypoint state
                const wpIndex = waypoints.findIndex(w => w.id === selectedEntity.id);
                if (wpIndex !== -1) {
                    waypoints[wpIndex].longitude = newLon;
                    waypoints[wpIndex].latitude = newLat;
                    waypoints[wpIndex].position = newPosition;
                    setWaypoints([...waypoints]);
                }
                updateFlightPath();
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Stop dragging on left-up
        handler.setInputAction(() => {
            if (dragging) {
                dragging = false;
                selectedEntity = null;
                viewer.current.scene.screenSpaceCameraController.enableRotate = true;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        // Adjust altitude with mouse wheel
        handler.setInputAction((movement) => {
            if (dragging && selectedEntity) {
                const delta = movement > 0 ? 10 : -10; // 10 meters per scroll tick
                const currentPosition = selectedEntity.position.getValue(viewer.current.clock.currentTime);
                const cartographic = Cesium.Cartographic.fromCartesian(currentPosition);
                cartographic.height += delta;
                const newPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
                selectedEntity.position.setValue(newPosition);

                // Update waypoint state
                const wpIndex = waypoints.findIndex(w => w.id === selectedEntity.id);
                if (wpIndex !== -1) {
                    waypoints[wpIndex].height = cartographic.height;
                    waypoints[wpIndex].position = newPosition;
                    setWaypoints([...waypoints]);
                }
                updateFlightPath();
            }
        }, Cesium.ScreenSpaceEventType.WHEEL);

        // Cleanup on unmount
        return () => {
            handler.destroy();
            viewer.current.destroy();
        };
    }, [missionMode]);

    // Function to add a waypoint entity
    const addWaypointEntity = (waypoint) => {
        viewer.current.entities.add({
            id: waypoint.id,
            position: waypoint.position,
            billboard: {
                image: 'https://example.com/waypoint-icon.png', // Replace with your image URL
                width: 32,
                height: 32,
                heightReference: Cesium.HeightReference.NONE
            },
            label: {
                text: `WP${waypoints.length + 1}\nLat: ${waypoint.latitude.toFixed(4)}°\nLon: ${waypoint.longitude.toFixed(4)}°\nAlt: ${waypoint.height.toFixed(0)}m`,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian3(0, -40, 0),
                heightReference: Cesium.HeightReference.NONE
            }
        });
        updateFlightPath();
    };

    // Function to update the flight path
    const updateFlightPath = () => {
        viewer.current.entities.removeById('flightPath');
        if (waypoints.length > 1) {
            viewer.current.entities.add({
                id: 'flightPath',
                polyline: {
                    positions: waypoints.map(wp => wp.position),
                    width: 4,
                    material: Cesium.Color.CYAN.withAlpha(0.8)
                }
            });
        }
    };

    // Toggle mission mode
    const toggleMissionMode = () => {
        setMissionMode(!missionMode);
    };

    // Clear all waypoints
    const clearMission = () => {
        viewer.current.entities.removeAll();
        setWaypoints([]);
    };

    return (
        <div className="mt-8 mb-8">
            <h2 className="text-white/80 text-lg font-medium mb-4">Drone Mission Planner</h2>
            <div className="relative border border-slate-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <div ref={cesiumContainer} className="absolute inset-0" />
                
                {/* Control Panel */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <button
                        onClick={toggleMissionMode}
                        className={`px-3 py-1.5 rounded-md backdrop-blur-sm border border-slate-700/50 text-sm ${
                            missionMode ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/90 text-white/90 hover:bg-slate-700/90'
                        }`}
                    >
                        {missionMode ? 'Adding Waypoints' : 'Add Waypoints'}
                    </button>
                    <button
                        onClick={clearMission}
                        className="px-3 py-1.5 bg-slate-800/90 text-white/90 rounded-md hover:bg-slate-700/90 backdrop-blur-sm border border-slate-700/50 text-sm"
                    >
                        Clear Mission
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestCesiumViewer;