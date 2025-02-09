import React, { useEffect, useState } from 'react';
import socketManager from '../utils/socketManager';

const DroneVideoFeed = () => {
    const [imageData, setImageData] = useState(null);

    useEffect(() => {
        socketManager.connectVideo();

        const handleVideoFrame = (frameData) => {
            if (frameData && frameData.data) {  // Check if data exists
                setImageData(`data:image/jpeg;base64,${frameData.data}`);
            }
        };

        // Change 'videoFrame' to 'video_frame' to match backend
        socketManager.subscribeVideo('video_frame', handleVideoFrame);

        // Add some logging
        socketManager.subscribeVideo('connection', (status) => {
            console.log('Video connection status:', status);
        });

        return () => {
            socketManager.unsubscribeVideo('video_frame', handleVideoFrame);
            socketManager.unsubscribeVideo('connection');
            socketManager.disconnectVideo();
        };
    }, []);

    return (
        <div className="w-full h-full relative">
            {imageData ? (
                <img
                    src={imageData}
                    className="w-full h-full object-contain"
                    alt="Drone Camera Feed"
                />
            ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-800 text-white">
                    Waiting for video feed...
                </div>
            )}
        </div>
    );
};

export default DroneVideoFeed;
