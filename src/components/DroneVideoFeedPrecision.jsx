import React, { useEffect, useState, useRef } from 'react';
import socketManager from '../utils/socketManager';

const DroneVideoFeedPrecision = () => {
    const [imageData, setImageData] = useState(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [debugMsg, setDebugMsg] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const videoContainerRef = useRef(null);

    // Fullscreen handler functions
    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (videoContainerRef.current.requestFullscreen) {
                videoContainerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setDebugMsg(`Fullscreen: ${!isFullscreen}`);
    };

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        // Handle escape key
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
                setDebugMsg('Fullscreen: false (ESC)');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isFullscreen]);

    return (
        <div 
            ref={videoContainerRef}
            className={`relative w-full bg-slate-900/50 rounded-lg shadow-lg overflow-hidden border border-gray-800 
                ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        >
            <div className={`flex flex-col ${isFullscreen ? 'h-screen' : ''}`}>
                {/* Header */}
                <div className="p-4 bg-slate-900/80 flex justify-between items-center border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <h2 className="text-white text-lg font-light tracking-wider">PRECISION LANDING CAMERA</h2>
                        {/* Fullscreen button */}
                        <button
                            onClick={toggleFullscreen}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                        >
                            <span className="font-mono text-lg">[ ]</span>
                        </button>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setIsEnabled(!isEnabled);
                                setDebugMsg(`Toggle camera: ${!isEnabled}`);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 
                                ${isEnabled ? 'bg-green-500/80 border border-green-500/30' : 'bg-slate-700/80 border border-gray-700'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 
                                    ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                        <span className="text-sm text-gray-300 tracking-wide">
                            {isEnabled ? "Camera On" : "Camera Off"}
                        </span>
                    </div>
                </div>

                {/* Video content area */}
                <div className={`relative flex-grow ${!isFullscreen ? 'aspect-video' : ''}`}>
                    {isEnabled ? (
                        imageData ? (
                            <img
                                src={imageData}
                                className="w-full h-full object-contain"
                                alt="Precision Landing Camera Feed"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full bg-slate-800/80 text-gray-300 font-light tracking-wide">
                                Waiting for precision camera feed...
                                <span className="ml-2 text-gray-400">
                                    (WebSocket {socketManager.isVideoConnected() ? 'Connected' : 'Disconnected'})
                                </span>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-center w-full h-full bg-slate-800/80 text-gray-300 font-light tracking-wide">
                            Camera is turned off
                        </div>
                    )}
                </div>

                {/* Debug message bar */}
                <div className="p-3 bg-slate-900/80 border-t border-gray-800">
                    <div className="text-xs text-gray-400 tracking-wider font-light flex items-center gap-2">
                        <span className="text-gray-500">DEBUG:</span>
                        {debugMsg}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DroneVideoFeedPrecision;