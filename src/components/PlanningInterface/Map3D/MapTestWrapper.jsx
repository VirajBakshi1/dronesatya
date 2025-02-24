import React, { useState } from 'react';
import CesiumMap from './CesiumMap';

const MapTestWrapper = () => {
    const [is3DMode, setIs3DMode] = useState(false);

    return (
        <div className="flex flex-col gap-4 text-white p-4">
            <div className="flex gap-4">
                <div className="w-2/3">
                    <div className="relative h-[500px] border border-slate-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setIs3DMode(!is3DMode)}
                            className="absolute top-4 right-4 z-[1000] px-3 py-1.5 bg-slate-800/90 text-white/90 rounded-md hover:bg-slate-700/90 flex items-center gap-2 backdrop-blur-sm border border-slate-700/50"
                        >
                            {is3DMode ? '2D View' : '3D View'}
                        </button>

                        {is3DMode ? (
                            <CesiumMap />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                2D View Placeholder
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-1/3">
                    <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
                        <h3 className="text-white/80 text-sm font-medium mb-3">Mission Controls</h3>
                        <div className="text-sm text-white/60">
                            Controls will go here
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapTestWrapper;