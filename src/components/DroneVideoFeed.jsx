import React from 'react';
import ReactPlayer from 'react-player';

const DroneVideoFeed = () => {
  return (
    <div className="w-full h-full">
      <ReactPlayer
        url="DRONE_VIDEO_FEED_URL"
        width="100%"
        height="100%"
        controls
      />
    </div>
  );
};

export default DroneVideoFeed;