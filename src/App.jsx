import React from 'react';
import DroneVideoFeed from './components/DroneVideoFeed';
import DroneMap from './components/DroneMap';
import DroneControls from './components/DroneControls';
import DroneTelemetry from './components/DroneTelemetry';
import WaypointDropbox from './components/WaypointDropbox';
import DronePWMControl from './components/DronePWMControls';

const App = () => {
  return (
    <div className="flex  flex-col h-screen ">
      <div className="flex-none bg-slate-950  p-4">
        <h1 className="text-white text-center text-2xl font-bold">QUICKVERSE Drone Control Panel</h1>
      </div>
      <div className="flex flex-1">
        <div className="w-1/2 bg-gray-950 p-4">
          <DroneVideoFeed />
        </div>
        <div className="w-1/2 bg-gray-950 p-4">
          <DroneMap />
        </div>
      </div>
      <div className="flex-none bg-gray-950  p-4">
        <DronePWMControl />
      </div>
      {/* <div className="flex-none p-4">
        <DroneControls />
      </div> */}
      <div className="flex-none bg-gray-950 p-4">
        <DroneTelemetry />
      </div>
      <div className="flex-none bg-gray-950 text-white p-4">
        <WaypointDropbox />
      </div>
    </div>
  );
};

export default App;
