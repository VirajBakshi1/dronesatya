import React from 'react';

const WaypointDropbox = () => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    // Parse the uploaded waypoint file and extract relevant data
    // Communicate the waypoints to the DroneMap component for display
  };

  return (
    <div className="border border-gray-300 p-4 rounded">
      <h2 className="text-xl font-bold mb-2">Waypoint Dropbox</h2>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".waypoints"
          onChange={handleFileUpload}
          className="border border-gray-300 p-2 rounded"
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Run
        </button>
      </div>
    </div>
  );
};

export default WaypointDropbox;
