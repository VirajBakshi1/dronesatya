import React from 'react';
import { MoreVertical } from 'lucide-react';
import SpaceHeader from '../components/SpaceHeader';
import SystemStatusMonitor from '../components/SystemStatusMonitor';
import MissionPlanningMap from '../components/PlanningInterface/MissionPlanningMap';
import "@cesium/widgets/Source/widgets.css";

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
          <MissionPlanningMap />
        </div>
      </div>

      {/* Cesium dark theme overrides */}
      <style jsx global>{`
        .cesium-widget {
          background-color: #020617 !important;
        }

        .cesium-widget-credits {
          display: none !important;
        }

        .cesium-viewer-toolbar {
          background: rgba(2, 6, 23, 0.8) !important;
          border-radius: 0.5rem;
          padding: 4px;
        }

        .cesium-button {
          background-color: rgba(30, 41, 59, 0.8) !important;
          border: 1px solid rgba(51, 65, 85, 0.5) !important;
          border-radius: 0.375rem !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .cesium-button:hover {
          background-color: rgba(51, 65, 85, 0.8) !important;
          color: white !important;
        }

        .cesium-viewer-bottom {
          display: none !important;
        }

        .cesium-viewer {
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .cesium-viewer-cesium3DTilesInspectorContainer {
          border-radius: 0.5rem;
          background: rgba(2, 6, 23, 0.8) !important;
        }
      `}</style>
    </div>
  );
};

export default PlanningInterface;