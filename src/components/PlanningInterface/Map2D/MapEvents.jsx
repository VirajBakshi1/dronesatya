// src/components/PlanningInterface/Map2D/MapEvents.jsx
import React from 'react';
import { useMapEvents } from 'react-leaflet';

export const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        }
    });
    return null;
};