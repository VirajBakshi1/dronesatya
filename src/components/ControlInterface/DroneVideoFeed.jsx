import React, { useEffect, useState, useRef } from 'react';
import socketManager from '../../utils/socketManager';

const DroneVideoFeed = () => {
    const [imageData, setImageData] = useState(null);
    const [isEnabled, setIsEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const videoContainerRef = useRef(null);
    const refreshTimerRef = useRef(null);

    useEffect(() => {
        console.log(`${isEnabled ? 'Enabling' : 'Disabling'} camera feed`);

        if (isEnabled) {
            // Ensure video connection
            if (!socketManager.isVideoConnected()) {
                socketManager.connectVideo();
            }

            const handleVideoFrame = (data) => {
                if (data &&
                    data.type === 'video_frame' &&
                    data.camera === 'web_camera' && // use appropriate camera name
                    data.data) {
                    setImageData(`data:image/jpeg;base64,${data.data}`);
                }
            };

            socketManager.subscribeVideo('video_frame', handleVideoFrame);
            console.log('Subscribed to video frames');

            // Send camera control message
            if (socketManager.videoSocket && socketManager.isVideoConnected()) {
                socketManager.videoSocket.send(JSON.stringify({
                    type: 'camera_control',
                    camera: 'web', // use appropriate camera type
                    enabled: true
                }));
            }

            return () => {
                console.log('Cleaning up video subscription');
                socketManager.unsubscribeVideo('video_frame', handleVideoFrame);

                // Send disable command only if we're actually disabling
                if (!isEnabled && socketManager.isVideoConnected()) {
                    socketManager.videoSocket.send(JSON.stringify({
                        type: 'camera_control',
                        camera: 'web', // use appropriate camera type
                        enabled: false
                    }));
                }
            };
        }
    }, [isEnabled]);

    // Auto-refresh timer
    useEffect(() => {
        if (autoRefresh && isEnabled) {
            refreshTimerRef.current = setInterval(refreshVideoFeed, 5000);
        } else if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
        }
        
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [autoRefresh, isEnabled]);

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
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isFullscreen]);

    // Add camera control message when toggling
    const handleCameraToggle = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);

        // Send camera control message
        if (socketManager.videoSocket && socketManager.isVideoConnected()) { // Check if videoSocket is available and connected
            socketManager.videoSocket.send(JSON.stringify({
                type: 'camera_control',
                camera: 'web',
                enabled: newState
            }));
        } else {
            console.warn("Video WebSocket not connected. Camera control command not sent.");
        }
    };

    // Video feed refresh function
    const refreshVideoFeed = () => {
        setLastRefresh(Date.now());
        if (socketManager.isVideoConnected()) {
            socketManager.videoSocket.send(JSON.stringify({
                type: 'refresh_video',
                camera: 'web',
                timestamp: Date.now()
            }));
            console.log('Refresh video feed requested');
        } else {
            console.warn("Video WebSocket not connected. Refresh command not sent.");
        }
    };

    return (
        <div
            ref={videoContainerRef}
            className={`relative w-full bg-slate-900/50 rounded-lg shadow-lg overflow-hidden border border-gray-800
                ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        >
            {/* Video container with flex layout */}
            <div className={`flex flex-col ${isFullscreen ? 'h-screen' : ''}`}>
                {/* Video content area that takes remaining space */}
                <div className={`relative flex-grow ${!isFullscreen ? 'aspect-video' : ''}`}>
                    {isEnabled ? (
                        imageData ? (
                            <img
                                src={imageData}
                                className="w-full h-full object-contain"
                                alt="Drone Camera Feed"
                                onError={(e) => console.error('Image load error:', e)}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full bg-slate-800/80 text-gray-300 font-light tracking-wide">
                                Waiting for video feed...
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

                {/* Control bar that stays at bottom */}
                <div className="p-3 bg-slate-900/80 flex justify-between items-center border-t border-gray-800">
                    <div className="flex items-center gap-2">
                        {/* Fullscreen button */}
                        <button
                            onClick={toggleFullscreen}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                        >
                            <span className="font-mono text-lg">{isFullscreen ? '[ ]' : '[ ]'}</span>
                        </button>
                        
                        {/* Refresh button */}
                        <button
                            onClick={refreshVideoFeed}
                            disabled={!isEnabled}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                        >
                            <span className="font-mono text-lg">⟳</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Auto refresh toggle */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-300 tracking-wide">Auto-refresh</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
                                    ${autoRefresh ? 'bg-green-500/80 border border-green-500/30' : 'bg-slate-700/80 border border-gray-700'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300
                                        ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {/* Camera toggle controls */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-300 tracking-wide">
                                {isEnabled ? "Camera On" : "Camera Off"}
                            </span>
                            <button
                                onClick={handleCameraToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
                                    ${isEnabled ? 'bg-green-500/80 border border-green-500/30' : 'bg-slate-700/80 border border-gray-700'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300
                                        ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DroneVideoFeed;