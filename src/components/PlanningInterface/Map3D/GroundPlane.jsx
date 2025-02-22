import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

const ZOOM_LEVEL = 18;
const TILE_SIZE = 256; // OSM tile size in pixels

export const GroundPlane = ({ mapCenter }) => {
    // Calculate tile coordinates
    const lat = mapCenter[0];
    const lon = mapCenter[1];
    const n = Math.pow(2, ZOOM_LEVEL);
    const centerX = Math.floor((lon + 180) / 360 * n); // X is east-west
    const centerY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n); // Z will be north-south

    // Calculate tile size in meters at current latitude
    const earthCircumference = 40075016.686;
    const tileSizeInMeters = (earthCircumference * Math.cos(lat * Math.PI / 180)) / Math.pow(2, ZOOM_LEVEL);

    // Create 3x3 grid of tiles
    const tiles = useMemo(() => {
        const tileArray = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                tileArray.push({
                    url: `https://tile.openstreetmap.org/${ZOOM_LEVEL}/${centerX + x}/${centerY + y}.png`,
                    position: [
                        x * tileSizeInMeters, // X: east-west
                        0,                   // Y: up-down (ground level)
                        y * tileSizeInMeters // Z: south-north (+ south, - north)
                    ]
                });
            }
        }
        return tileArray;
    }, [centerX, centerY, tileSizeInMeters]);

    // Load textures
    const textures = useLoader(TextureLoader, tiles.map(t => t.url));

    return (
        <group>
            {/* Base grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}> {/* Flat on XZ plane, Y slightly down */}
                <planeGeometry args={[tileSizeInMeters * 5, tileSizeInMeters * 5]} />
                <meshStandardMaterial color="#1a2942" opacity={0.3} transparent />
            </mesh>

            {/* Map tiles */}
            {tiles.map((tile, index) => (
                <mesh
                    key={index}
                    rotation={[-Math.PI / 2, 0, 0]} // Flat on XZ plane
                    position={tile.position}
                >
                    <planeGeometry args={[tileSizeInMeters, tileSizeInMeters]} />
                    <meshStandardMaterial
                        map={textures[index]}
                        transparent
                        opacity={0.8}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
};