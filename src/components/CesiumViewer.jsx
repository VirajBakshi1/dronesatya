import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const CesiumViewer = () => {
    const cesiumContainer = useRef(null);
    const viewer = useRef(null);

    useEffect(() => {
        if (!cesiumContainer.current) return;

        // Initialize the Cesium Viewer
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
            terrainProvider: Cesium.createWorldTerrain(),
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
        viewer.current.scene.primitives.add(
            Cesium.createOsmBuildings()
        );

        // Set initial camera position
        viewer.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                73.8567, // longitude
                18.5204, // latitude
                1000    // height in meters
            ),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_FOUR,
                roll: 0.0
            }
        });

        // Cleanup function
        return () => {
            if (viewer.current) {
                viewer.current.destroy();
                viewer.current = null;
            }
        };
    }, []);

    return (
        <div className="mt-8 mb-8">
            <h2 className="text-white/80 text-lg font-medium mb-4">3D Mission View</h2>
            <div className="relative border border-slate-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <div 
                    ref={cesiumContainer} 
                    className="absolute inset-0"
                />
                
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-4 z-10 px-3 py-2 bg-slate-800/90 backdrop-blur-sm text-white/90 rounded-lg border border-slate-700/50 text-sm">
                    <div className="font-medium mb-1">3D Controls</div>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-400">
                        <span>Left Click + Drag</span>
                        <span>Rotate View</span>
                        <span>Right Click + Drag</span>
                        <span>Zoom In/Out</span>
                        <span>Mouse Wheel</span>
                        <span>Zoom In/Out</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CesiumViewer;