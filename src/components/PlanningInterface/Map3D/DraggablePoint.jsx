import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import { threeDToGPS, calculateNewPosition, gpsTo3D } from '../mapHelpers';
import { LOCK_MODES } from '../missionConstants';

export const DraggablePoint = ({ position, index, info, onDrag, lockMode }) => {
    const [hovered, setHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const mesh = useRef();
    const { camera, raycaster, gl } = useThree();

    const handleDrag = useCallback((e) => {
        if (!mesh.current || !isDragging) return;

        // Update raycaster with current mouse position
        const mouse = {
            x: (e.clientX / gl.domElement.clientWidth) * 2 - 1,
            y: -(e.clientY / gl.domElement.clientHeight) * 2 + 1
        };
        raycaster.setFromCamera(mouse, camera);

        const intersection = calculateNewPosition(
            raycaster,
            camera,
            lockMode,
            mesh.current.position
        );

        if (intersection) {
            console.log('Dragging Waypoint', index + 1);
            console.log('Intersection (3D):', intersection);

            let newX = intersection.x; // East-west
            let newY = intersection.y; // Up-down
            let newZ = intersection.z; // South-north

            // Apply lock mode constraints
            switch (lockMode) {
                case LOCK_MODES.XY:
                    newY = mesh.current.position.y; // Lock Y (up-down), allow X (east-west) and Z (south-north)
                    break;
                case LOCK_MODES.Z:
                    newX = mesh.current.position.x; // Lock X (east-west), allow Y (up-down) and Z (south-north)
                    break;
                default:
                    break;
            }

            const gpsCoords = threeDToGPS(
                newX,
                newY,
                newZ,
                info.mapCenter
            );

            console.log('GPS Coords:', gpsCoords);
            console.log('Original GPS (info):', { lat: info.lat, lng: info.lng, alt: info.alt });
            console.log('Map Center:', info.mapCenter);

            // Update waypoint position
            onDrag(index, gpsCoords);
            mesh.current.position.set(newX, newY, newZ);

            // Verify 3D position matches GPS conversion
            const recalculated3D = gpsTo3D(gpsCoords.lat, gpsCoords.lng, gpsCoords.alt, info.mapCenter);
            console.log('Recalculated 3D from GPS:', recalculated3D);
        }
    }, [lockMode, camera, raycaster, gl, index, info.mapCenter, onDrag, isDragging]);

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (isDragging) {
                handleDrag(e);
            }
        };

        const handlePointerUp = (e) => {
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, handleDrag]);

    return (
        <group position={position}>
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
            >
                <sphereGeometry args={[2]} />
                <meshStandardMaterial 
                    color={isDragging ? "#22c55e" : hovered ? "#3b82f6" : "#ef4444"} 
                    emissive={hovered ? "#1e40af" : "#7f1d1d"}
                    emissiveIntensity={0.5}
                />
            </mesh>

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