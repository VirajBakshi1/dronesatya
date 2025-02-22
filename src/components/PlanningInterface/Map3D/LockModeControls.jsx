// src/components/PlanningInterface/Map3D/LockModeControls.jsx
import React from 'react';
import { Move3d, ArrowUpDown, MoveHorizontal } from 'lucide-react';
import { LOCK_MODES } from '../missionConstants';

export const LockModeControls = ({ lockMode, setLockMode }) => (
    <div className="absolute top-16 left-4 z-[1000] flex flex-col gap-2 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700/50">
        <button
            onClick={() => setLockMode(LOCK_MODES.NONE)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.NONE ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <Move3d className="w-4 h-4" />
            <span>Free Move</span>
        </button>
        <button
            onClick={() => setLockMode(LOCK_MODES.XY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.XY ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <ArrowUpDown className="w-4 h-4" />
            <span>Altitude Only</span>
        </button>
        <button
            onClick={() => setLockMode(LOCK_MODES.Z)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                lockMode === LOCK_MODES.Z ? 'bg-blue-500/20 text-blue-400' : 'text-white/90 hover:bg-slate-700/50'
            }`}
        >
            <MoveHorizontal className="w-4 h-4" />
            <span>Horizontal Only</span>
        </button>
    </div>
);