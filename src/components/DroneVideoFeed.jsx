import React, { useEffect, useState } from 'react';
import socketManager from '../utils/socketManager';

const DroneVideoFeed = () => {
    const [imageData, setImageData] = useState(null);

    useEffect(() => {
        socketManager.connectVideo();

        const handleVideoFrame = (frameData) => {
            // Assuming frameData is base64 encoded JPEG string
            setImageData(`data:image/jpeg;base64,${frameData}`);
        };

        socketManager.subscribeVideo('videoFrame', handleVideoFrame); // Subscribe to 'videoFrame' event

        return () => {
            socketManager.unsubscribeVideo('videoFrame', handleVideoFrame); // Unsubscribe from 'videoFrame'
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
