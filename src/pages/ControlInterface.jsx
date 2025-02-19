import React from 'react';
import { MoreVertical } from 'lucide-react';
import DroneVideoFeed from '../components/DroneVideoFeed';
import DroneVideoFeedPrecision from '../components/DroneVideoFeedPrecision';
import DroneMap from '../components/DroneMap';
import DroneTelemetry from '../components/DroneTelemetry';
import WaypointDropbox from '../components/WaypointDropbox';
import DronePWMControl from '../components/DronePWMControls';
import DroneAttitude from '../components/DroneAttitude';
import DronePrecisionLand from '../components/DronePrecisionLand';
import DroneHealth from '../components/DroneHealth';
import DroneBattery from '../components/DroneBattery';
import DroneTemperatureMonitoring from '../components/DroneTemperatureMonitoring';
import DronePayload from '../components/DronePayload';
import SpaceHeader from '../components/SpaceHeader';
import ComponentWrapper from '../components/ComponentWrapper';
import SystemStatusMonitor from '../components/SystemStatusMonitor';

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