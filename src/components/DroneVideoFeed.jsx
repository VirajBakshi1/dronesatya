import React, { useEffect, useState } from 'react';
import socketManager from '../utils/socketManager';

const DroneVideoFeed = () => {
    const [imageData, setImageData] = useState(null);

    useEffect(() => {
        console.log('DroneVideoFeed mounted');
        socketManager.connectVideo();

        const handleVideoFrame = (frameData) => {
            console.log('Received frame data length:', frameData?.length); // Debug log
            if (frameData) {
                setImageData(`data:image/jpeg;base64,${frameData}`);
            }
        };

        socketManager.subscribeVideo('video_frame', handleVideoFrame);

        // Add connection status handler
        socketManager.subscribeVideo('connection', (status) => {
            console.log('Video connection status:', status);
        });

        return () => {
            console.log('DroneVideoFeed unmounting');
            socketManager.unsubscribeVideo('video_frame', handleVideoFrame);
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
                    onError={(e) => console.error('Image load error:', e)}
                />
            ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-800 text-white">
                    Waiting for video feed... (WebSocket {socketManager.isVideoConnected() ? 'Connected' : 'Disconnected'})
                </div>
            )}
        </div>
    );
};

export default DroneVideoFeed;
