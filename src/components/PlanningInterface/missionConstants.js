// src/components/PlanningInterface/missionConstants.js
export const MISSION_TYPES = {
    TAKEOFF: 'TAKEOFF',
    WAYPOINT: 'WAYPOINT',
    WAIT: 'WAIT',
    LAND: 'LAND',
    RTH: 'RETURN_TO_HOME',
    CIRCLE: 'CIRCLE_POINT',
    SPEED: 'SET_SPEED',
    SPEED_CHANGE: 'SPEED_CHANGE'
};

export const LOCK_MODES = {
    NONE: 'none',
    XY: 'xy',
    Z: 'z'
};

export const DEFAULT_SPEED = 10;
export const TAKEOFF_SPEED = 2;
export const LANDING_SPEED = 1;