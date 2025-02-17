class WaypointStore {
    constructor() {
      this.listeners = new Set();
      this.waypoints = [];
    }
  
    setWaypoints(waypoints) {
      this.waypoints = waypoints;
      this.notifyListeners();
    }
  
    getWaypoints() {
      return this.waypoints;
    }
  
    addListener(callback) {
      this.listeners.add(callback);
    }
  
    removeListener(callback) {
      this.listeners.delete(callback);
    }
  
    notifyListeners() {
      this.listeners.forEach(callback => callback(this.waypoints));
    }
  }
  
  export const waypointStore = new WaypointStore();