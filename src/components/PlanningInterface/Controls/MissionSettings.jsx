// src/components/PlanningInterface/Controls/MissionSettings.jsx
import React from 'react';
import { Gauge, Wind, Download } from 'lucide-react';
import { MISSION_TYPES } from '../missionConstants';

export const MissionSettings = ({
    speedSetting,
    setSpeedSetting,
    addSpeedChange,
    generateMissionFile
}) => {
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <h3 className="text-white/80 text-sm font-medium mb-3">Mission Settings</h3>
            <div className="flex flex-col gap-2">
                <div className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 rounded-md">
                    <Gauge className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-white/80">Speed</span>
                    <input
                        type="number"
                        value={speedSetting}
                        onChange={(e) => setSpeedSetting(Number(e.target.value))}
                        className="w-16 px-2 py-0.5 ml-auto text-xs rounded bg-slate-600/50 text-white/90"
                        placeholder="m/s"
                        min="0"
                    />
                </div>
                <button
                    onClick={() => addSpeedChange(speedSetting)}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white/90 rounded-md transition-colors"
                >
                    <Wind className="w-3.5 h-3.5" />
                    <span>Set Speed</span>
                </button>
                <button
                    onClick={generateMissionFile}
                    className="flex items-center text-sm gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Mission</span>
                </button>
            </div>
        </div>
    );
};