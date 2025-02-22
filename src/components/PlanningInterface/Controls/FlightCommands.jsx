// src/components/PlanningInterface/Controls/FlightCommands.jsx
import React from 'react';
import { Plane, Home, Route } from 'lucide-react';
import { MISSION_TYPES } from '../missionConstants';

export const FlightCommands = ({
    addCommand,
    selectedAltitude,
    setSelectedAltitude
}) => {
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <h3 className="text-white/80 text-sm font-medium mb-3">Flight Commands</h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => addCommand(MISSION_TYPES.TAKEOFF)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Plane className="w-3.5 h-3.5" />
                    <span>Takeoff</span>
                    <input
                        type="number"
                        value={selectedAltitude}
                        onChange={(e) => setSelectedAltitude(Number(e.target.value))}
                        className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                        placeholder="Alt (m)"
                        min="0"
                        step="0.1"
                    />
                </button>
                <button
                    onClick={() => addCommand(MISSION_TYPES.LAND)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Home className="w-3.5 h-3.5" />
                    <span>Land</span>
                </button>
                <button
                    onClick={() => addCommand(MISSION_TYPES.RTH)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Route className="w-3.5 h-3.5" />
                    <span>Return to Home</span>
                </button>
            </div>
        </div>
    );
};
