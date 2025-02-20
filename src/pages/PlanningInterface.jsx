import React from 'react';
import { MoreVertical } from 'lucide-react';
import SpaceHeader from '../components/SpaceHeader';
import ComponentWrapper from '../components/ComponentWrapper';
import SystemStatusMonitor from '../components/SystemStatusMonitor';
import MissionPlanningMap from '../components/MissionPlanningMap';

const PlanningInterface = ({ onOpenMenu }) => {
  return (
    <div className="min-h-screen bg-slate-950">
      <button
        onClick={onOpenMenu}
        className="fixed top-4 right-4 z-40 p-2 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-300"
      >
        <MoreVertical size={24} />
      </button>

      <div className="max-w-full px-2">
        <SpaceHeader interfaceType="PLANNING" />
        <SystemStatusMonitor />
        <div className="mt-4">
          <ComponentWrapper>
            <MissionPlanningMap />
          </ComponentWrapper>
        </div>
      </div>
    </div>
  );
};

export default PlanningInterface;