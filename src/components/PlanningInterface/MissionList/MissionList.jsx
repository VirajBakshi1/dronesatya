// src/components/PlanningInterface/MissionList/MissionList.jsx
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { MissionItem } from './MissionItem';

export const MissionList = ({
    mission,
    handleDragEnd,
    handleWaypointAltitudeChange,
    removeMissionPoint,
    globalAltitude,
    setGlobalAltitude,
    updateAllAltitudes,
    missionStats
}) => {
    return (
        <div className="h-[500px] bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white/80 text-sm font-medium">Mission Sequence</h3>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <span>{mission.length} commands</span>
                        <span>•</span>
                        <span>Distance: {missionStats.distance}m</span>
                        <span>•</span>
                        <span>Time: {missionStats.time}s</span>
                    </div>
                </div>

                {/* Global Altitude Control */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-slate-700/50 rounded">
                    <input
                        type="number"
                        value={globalAltitude}
                        onChange={(e) => setGlobalAltitude(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-600/50 rounded text-white/90"
                        placeholder="Alt (m)"
                        min="0"
                        step="0.1"
                    />
                    <button
                        onClick={updateAllAltitudes}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                    >
                        Update All
                    </button>
                </div>

                {/* Mission List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="mission-sequence">
                        {(provided) => (
                            <div 
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex flex-col gap-2"
                            >
                                {mission.map((point, index) => (
                                    <Draggable
                                        key={`${point.type}-${index}`}
                                        draggableId={`${point.type}-${index}`}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                <MissionItem
                                                    point={point}
                                                    index={index}
                                                    handleWaypointAltitudeChange={handleWaypointAltitudeChange}
                                                    removeMissionPoint={removeMissionPoint}
                                                    dragHandleProps={provided.dragHandleProps}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );
};