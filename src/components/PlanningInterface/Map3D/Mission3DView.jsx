// src/components/PlanningInterface/Map3D/Mission3DView.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from '@cesium/engine';
import { Viewer } from '@cesium/widgets';
import { MISSION_TYPES, LOCK_MODES } from '../missionConstants';
import { LockModeControls } from './LockModeControls';

// Initialize the Cesium ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNzczMDI0Ni1hYWIzLTQ3NWItYTdiNy1jYzk0N2MyMzllM2UiLCJpZCI6Mjc3OTkyLCJpYXQiOjE3NDAxMzQxNDd9.jqgPDpM7pZYgWZoJuUAEqaGAhVHMEmC0CQdJpZWySBo';

export const Mission3DView = ({ mission, mapCenter, onPointDrag }) => {
    const cesiumContainer = useRef(null);
    const viewer = useRef(null);
    const [lockMode, setLockMode] = useState(LOCK_MODES.NONE);
    const selectedEntity = useRef(null);
    const dragActive = useRef(false);

    useEffect(() => {
        if (!cesiumContainer.current) return;

        // Create the Cesium viewer
        viewer.current = new Viewer(cesiumContainer.current, {
            terrainProvider: new Cesium.CesiumTerrainProvider({
                url: Cesium.IonResource.fromAssetId(1)
            }),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            scene3DOnly: true
        });

        // Enable terrain and buildings
        viewer.current.scene.globe.enableLighting = true;
        const buildingTileset = viewer.current.scene.primitives.add(
            Cesium.createOsmBuildings()
        );

        // Set initial camera position
        viewer.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                mapCenter[1],
                mapCenter[0],
                1000
            ),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_FOUR,
                roll: 0.0
            }
        });

        // Setup input handling
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);

        // Handle left click
        handler.setInputAction((click) => {
            const pickedObject = viewer.current.scene.pick(click.position);
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.waypointIndex !== undefined) {
                selectedEntity.current = pickedObject.id;
                dragActive.current = true;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        // Handle mouse move
        handler.setInputAction((movement) => {
            if (dragActive.current && selectedEntity.current) {
                const cartesian = viewer.current.scene.camera.pickEllipsoid(
                    movement.endPosition,
                    viewer.current.scene.globe.ellipsoid
                );

                if (cartesian) {
                    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                    let altitude = selectedEntity.current.position.getValue().z;

                    // Apply lock mode constraints
                    if (lockMode === LOCK_MODES.XY) {
                        // Keep current altitude
                        altitude = selectedEntity.current.position.getValue().z;
                    } else if (lockMode === LOCK_MODES.Z) {
                        // Only change altitude based on view angle
                        const ray = viewer.current.camera.getPickRay(movement.endPosition);
                        const intersection = viewer.current.scene.globe.pick(ray, viewer.current.scene);
                        if (intersection) {
                            const intersectionCartographic = Cesium.Cartographic.fromCartesian(intersection);
                            altitude = intersectionCartographic.height;
                        }
                    }

                    const position = Cesium.Cartesian3.fromRadians(
                        cartographic.longitude,
                        cartographic.latitude,
                        altitude
                    );

                    selectedEntity.current.position = position;

                    // Update mission state
                    const degrees = {
                        lat: Cesium.Math.toDegrees(cartographic.latitude),
                        lng: Cesium.Math.toDegrees(cartographic.longitude),
                        alt: altitude
                    };
                    onPointDrag(selectedEntity.current.waypointIndex, degrees);
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Handle mouse up
        handler.setInputAction(() => {
            dragActive.current = false;
            selectedEntity.current = null;
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        return () => {
            handler.destroy();
            viewer.current.destroy();
        };
    }, []);

    // Update waypoints when mission changes
    useEffect(() => {
        if (!viewer.current) return;

        // Clear existing entities
        viewer.current.entities.removeAll();

        // Add waypoint entities
        const waypointEntities = mission
            .filter(point => point.type === MISSION_TYPES.WAYPOINT)
            .map((point, index) => {
                return viewer.current.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.alt),
                    waypointIndex: index,
                    point: {
                        pixelSize: 12,
                        color: Cesium.Color.RED,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                    },
                    label: {
                        text: `${index + 1}`,
                        font: '14px sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -10)
                    }
                });
            });

        // Add path between waypoints
        if (waypointEntities.length > 1) {
            viewer.current.entities.add({
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        return waypointEntities.map(entity => entity.position.getValue());
                    }, false),
                    width: 2,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: Cesium.Color.BLUE
                    }),
                    clampToGround: false
                }
            });
        }
    }, [mission]);

    return (
        <div className="relative h-full w-full">
            <div ref={cesiumContainer} className="absolute inset-0" />
            <LockModeControls
                lockMode={lockMode}
                setLockMode={setLockMode}
            />
            <div className="absolute bottom-4 left-4 z-[1000] px-3 py-2 bg-slate-800/90 backdrop-blur-sm text-white/90 rounded-lg border border-slate-700/50 text-sm">
                <div className="font-medium mb-1">3D Controls</div>
                <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-400">
                    <span>Left Click + Drag</span>
                    <span>Move Waypoint</span>
                    <span>Right Click + Drag</span>
                    <span>Rotate View</span>
                    <span>Mouse Wheel</span>
                    <span>Zoom In/Out</span>
                </div>
            </div>
        </div>
    );
};