import React, { useEffect, useState } from 'react';
import socketManager from '../utils/socketManager';

const DroneVideoFeed = () => {
    const [videoSocket, setVideoSocket] = useState(null);
    const [imageData, setImageData] = useState(null);

    useEffect(() => {
        // Create a separate WebSocket for video
        const ws = new WebSocket('ws://172.29.172.210:5001/video');
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'video_frame') {
                    setImageData(`data:image/jpeg;base64,${data.data}`);
                }
            } catch (error) {
                console.error('Video frame error:', error);
            }
        };

        ws.onclose = () => {
            console.log('Video connection closed');
            setVideoSocket(null);
        };

        setVideoSocket(ws);

        return () => {
            if (ws) {
                ws.close();
            }
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
