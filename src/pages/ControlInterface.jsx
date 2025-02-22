import React, { useState, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

// Drone Components
import DroneVideoFeed from '../components/ControlInterface/DroneVideoFeed.jsx';
import DroneVideoFeedPrecision from '../components/ControlInterface/DroneVideoFeedPrecision.jsx';
import DroneMap from '../components/ControlInterface/DroneMap.jsx';
import DroneTelemetry from '../components/ControlInterface/DroneTelemetry.jsx';
import WaypointDropbox from '../components/ControlInterface/WaypointDropbox.jsx';
import DronePWMControl from '../components/ControlInterface/DronePWMControls.jsx';
import DroneAttitude from '../components/ControlInterface/DroneAttitude.jsx';
import DronePrecisionLand from '../components/ControlInterface/DronePrecisionLand.jsx';
import DroneHealth from '../components/ControlInterface/DroneHealth.jsx';
import DroneBattery from '../components/ControlInterface/DroneBattery.jsx';
import DroneTemperatureMonitoring from '../components/ControlInterface/DroneTemperatureMonitoring.jsx';
import DronePayload from '../components/ControlInterface/DronePayload.jsx';

// UI Components
import SpaceHeader from '../components/SpaceHeader';
import ComponentWrapper from '../components/ComponentWrapper';
import SystemStatusMonitor from '../components/SystemStatusMonitor';

// Utilities
import socketManager from '../utils/socketManager';

// Main ControlInterface Component
const ControlInterface = ({ onOpenMenu }) => {
  return (
    <div className="min-h-screen bg-slate-950">
      <button
        onClick={onOpenMenu}
        className="fixed top-4 right-4 z-40 p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        <MoreVertical size={24} />
      </button>

      <div className="max-w-full px-2">
        <SpaceHeader interfaceType="CONTROL" />
        <SystemStatusMonitor />
        
        <div className="flex min-h-[500px] gap-4">
          <div className="w-1/2 p-4">
            <ComponentWrapper>
              <DroneVideoFeed />
            </ComponentWrapper>
          </div>
          <div className="w-1/2 p-4">
            <ComponentWrapper>
              <DroneMap />
            </ComponentWrapper>
          </div>
        </div>

        <div className="flex items-start mb-4 gap-4">
          <div className="w-3/5 pl-4">
            <ComponentWrapper>
              <DronePWMControl />
            </ComponentWrapper>
          </div>
          <div className="w-2/5 pl-16">
            <ComponentWrapper>
              <WaypointDropbox />
            </ComponentWrapper>
          </div>
        </div>

        <div className="flex gap-4 px-4 mb-4">
          <div className="w-1/2">
            <ComponentWrapper className="scale-120">
              <DroneBattery />
            </ComponentWrapper>
          </div>
          <div className="flex flex-col w-1/2 gap-4">
            <ComponentWrapper className="scale-80">
              <DronePayload />
            </ComponentWrapper>
            <ComponentWrapper>
              <DroneHealth />
            </ComponentWrapper>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 p-4">
            <ComponentWrapper>
              <DroneTelemetry />
            </ComponentWrapper>
          </div>
          <div className="flex-1 p-4">
            <ComponentWrapper>
              <DroneAttitude />
            </ComponentWrapper>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-1/2 p-4">
            <ComponentWrapper>
              <DroneVideoFeedPrecision />
            </ComponentWrapper>
          </div>
          <div className="w-1/2 p-4">
            <ComponentWrapper>
              <DronePrecisionLand />
            </ComponentWrapper>
          </div>
        </div>

        <div className="p-4">
          <ComponentWrapper>
            <DroneTemperatureMonitoring />
          </ComponentWrapper>
        </div>
      </div>
    </div>
  );
};

export default ControlInterface;