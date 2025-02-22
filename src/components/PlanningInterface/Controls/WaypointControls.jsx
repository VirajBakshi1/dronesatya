// src/components/PlanningInterface/Controls/WaypointControls.jsx
import React from 'react';
import { MapPin, Circle, Clock } from 'lucide-react';
import { MISSION_TYPES } from '../missionConstants';

export const WaypointControls = ({
    isAddingWaypoints,
    setIsAddingWaypoints,
    addCommand,
    circleRadius,
    setCircleRadius,
    circleTurns,
    setCircleTurns,
    waitTime,
    setWaitTime
}) => {
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <h3 className="text-white/80 text-sm font-medium mb-3">Waypoint Controls</h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => setIsAddingWaypoints(!isAddingWaypoints)}
                    className={`flex items-center text-sm gap-2 px-3 py-1.5 ${
                        isAddingWaypoints ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-white/90'
                    } hover:bg-slate-700 rounded-md transition-colors`}
                >
                    <MapPin className="w-3.5 h-3.5" />
                    {isAddingWaypoints ? 'Adding Waypoints' : 'Add Waypoints'}
                </button>
                <button
                    onClick={() => addCommand(MISSION_TYPES.CIRCLE)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Circle className="w-3.5 h-3.5" />
                    <span>Circle Mode</span>
                    <div className="ml-auto flex items-center gap-2">
                        <input
                            type="number"
                            value={circleRadius}
                            onChange={(e) => setCircleRadius(Number(e.target.value))}
                            className="w-16 px-2 py-0.5 text-xs rounded bg-slate-600/50 text-white/90"
                            placeholder="Radius (m)"
                            min="0"
                        />
                        <input
                            type="number"
                            value={circleTurns}
                            onChange={(e) => setCircleTurns(Number(e.target.value))}
                            className="w-16 px-2 py-0.5 text-xs rounded bg-slate-600/50 text-white/90"
                            placeholder="Turns"
                            min="1"
                        />
                    </div>
                </button>
                <button
                    onClick={() => addCommand(MISSION_TYPES.WAIT)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hold Position</span>
                    <input
                        type="number"
                        value={waitTime}
                        onChange={(e) => setWaitTime(Number(e.target.value))}
                        className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                        placeholder="Time (s)"
                        min="0"
                    />
                </button>
            </div>
        </div>
    );
};