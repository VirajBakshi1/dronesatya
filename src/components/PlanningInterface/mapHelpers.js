import L from 'leaflet';
import * as THREE from 'three';
import { LOCK_MODES } from './missionConstants';

export const waypointIcon = (number) => L.divIcon({
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

const toRadians = (degrees) => degrees * Math.PI / 180;
const toDegrees = (radians) => radians * 180 / Math.PI;

export const calculateDistance = (lat1, lon1, alt1, lat2, lon2, alt2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const horizontalDist = R * c;
    const verticalDist = Math.abs(alt2 - alt1);

    return Math.sqrt(Math.pow(horizontalDist, 2) + Math.pow(verticalDist, 2));
};

const getScaleFactor = (lat) => {
    return Math.cos(toRadians(lat));
};

const EARTH_RADIUS = 6371000; // Earth's radius in meters
const ZOOM_LEVEL = 18;

const getTileSizeInMeters = (lat) => {
    const earthCircumference = 40075016.686; // Earth's circumference in meters
    return (earthCircumference * Math.cos(lat * Math.PI / 180)) / Math.pow(2, ZOOM_LEVEL);
};

export const gpsTo3D = (lat, lng, alt, mapCenter) => {
    const earthCircumference = 40075016.686;
    const tileSizeInMeters = (earthCircumference * Math.cos(mapCenter[0] * Math.PI / 180)) / Math.pow(2, ZOOM_LEVEL);
    const n = Math.pow(2, ZOOM_LEVEL);

    // Convert GPS to tile coordinates
    const xTile = (lng + 180) / 360 * n; // X is east-west (+ east, - west)
    const latRad = lat * Math.PI / 180;
    const yTile = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n; // Z will be north-south (+ south, - north)

    // Center tile coordinates
    const centerXTile = (mapCenter[1] + 180) / 360 * n;
    const centerLatRad = mapCenter[0] * Math.PI / 180;
    const centerYTile = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2 * n;

    // Calculate offsets in meters
    const xOffset = (xTile - centerXTile) * tileSizeInMeters; // Positive east, negative west
    const zOffset = (centerYTile - yTile) * tileSizeInMeters; // Positive south, negative north

    return [xOffset, alt, zOffset]; // [X east-west, Y up-down, Z south-north]
};

export const threeDToGPS = (x, y, z, mapCenter) => {
    const earthCircumference = 40075016.686;
    const tileSizeInMeters = (earthCircumference * Math.cos(mapCenter[0] * Math.PI / 180)) / Math.pow(2, ZOOM_LEVEL);
    const n = Math.pow(2, ZOOM_LEVEL);

    // Convert 3D coordinates back to tile offsets
    const xOffset = x; // X is east-west
    const zOffset = z; // Z is south-north

    const xTileOffset = xOffset / tileSizeInMeters;
    const yTileOffset = -zOffset / tileSizeInMeters; // Reverse to match tile Y (south increases)

    // Center tile coordinates
    const centerXTile = (mapCenter[1] + 180) / 360 * n;
    const centerLatRad = mapCenter[0] * Math.PI / 180;
    const centerYTile = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2 * n;

    // Convert to tile coordinates
    const xTile = centerXTile + xTileOffset;
    const yTile = centerYTile + yTileOffset;

    // Convert tile coordinates to GPS
    const lng = (xTile / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * yTile / n)));
    const lat = latRad * 180 / Math.PI;

    return { lat, lng, alt: y }; // Y is altitude (up-down)
};

export const calculateNewPosition = (raycaster, camera, movementPlane, point) => {
    const plane = new THREE.Plane();
    const planeNormal = new THREE.Vector3();

    switch (movementPlane) {
        case LOCK_MODES.XY:
            planeNormal.set(0, 1, 0); // Lock Y (up-down), allow X (east-west) and Z (south-north)
            break;
        case LOCK_MODES.Z:
            planeNormal.set(1, 0, 0); // Lock X (east-west), allow Y (up-down) and Z (south-north)
            break;
        default:
            planeNormal.copy(camera.position).sub(point).normalize(); // Free movement
    }

    plane.setFromNormalAndCoplanarPoint(
        planeNormal,
        new THREE.Vector3(point.x, point.y, point.z)
    );

    const intersection = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, intersection) ? intersection : null;
};

export const getTileCoords = (lat, lng, zoom) => {
    const n = Math.pow(2, zoom);
    const latRad = toRadians(lat);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
};