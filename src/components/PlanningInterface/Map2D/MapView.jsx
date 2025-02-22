// src/components/PlanningInterface/Map2D/MapView.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapEvents } from './MapEvents';
import { waypointIcon } from '../mapHelpers';
import { MISSION_TYPES } from '../missionConstants';

export const MapView = ({ 
    mapCenter, 
    mission, 
    handleMapClick, 
    handleWaypointDrag 
}) => {
    return (
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
    );
};