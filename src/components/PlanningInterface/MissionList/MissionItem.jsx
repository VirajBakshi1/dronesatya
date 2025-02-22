// src/components/PlanningInterface/MissionList/MissionItem.jsx
import React from 'react';
import { 
    Plane, MapPin, Clock, Home, Circle, 
    Wind, Route, X, GripHorizontal 
} from 'lucide-react';
import { MISSION_TYPES } from '../missionConstants';

export const MissionItem = ({ 
    point, 
    index, 
    handleWaypointAltitudeChange,
    removeMissionPoint,
    dragHandleProps 
}) => {
    return (
        <div
            className={`
                flex items-center justify-between gap-2 p-2 rounded-md
                bg-slate-800/50 border border-slate-700
            `}
            {...dragHandleProps}
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
    );
};