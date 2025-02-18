// socketManager.js
const CONTROL_WS_URL = 'ws://172.29.172.210:5001/ws';
const VIDEO_WS_URL = 'ws://172.29.172.210:5001/video';

class SocketManager {
    constructor() {
        // Control socket properties
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
        this.reconnectTimer = null;

        // Video socket properties
        this.videoSocket = null;
        this.videoConnected = false;
        this.videoListeners = new Map();
        this.videoReconnectTimer = null;
    }

    // Control socket methods
    connect() {
        if (this.socket) return;

        try {
            console.log('Connecting to Control WebSocket...');
            this.socket = new WebSocket(CONTROL_WS_URL);

            this.socket.onopen = () => {
                console.log('Control WebSocket Connected');
                this.connected = true;
                this.notifyListeners('connection', { status: 'connected' });
                if (this.reconnectTimer) {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.socket.onclose = () => {
                console.log('Control WebSocket Disconnected');
                this.connected = false;
                this.socket = null;
                this.notifyListeners('connection', { status: 'disconnected' });
                this.startReconnection();
            };

            this.socket.onerror = (error) => {
                console.error('Control WebSocket Error:', error);
                this.notifyListeners('error', { error: error.message });
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type) {
                        this.notifyListeners(message.type, message.data);
                    }
                } catch (error) {
                    console.error('Control message parsing error:', error);
                }
            };

        } catch (error) {
            console.error('Control connection error:', error);
            this.startReconnection();
        }
    }

    startReconnection() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setInterval(() => {
                console.log('Attempting to reconnect control...');
                this.connect();
            }, 2000);
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
    }

    sendCommand(command, params = {}) {
        if (!this.isConnected()) {
            console.error('Not connected to Control WebSocket');
            return false;
        }

        const message = {
            type: 'command',
            payload: {
                command,
                params
            }
        };

        try {
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Send error:', error);
            return false;
        }
    }

    // Video socket methods
    connectVideo() {
        if (this.videoSocket) return;

        try {
            console.log('Connecting to Video WebSocket...');
            this.videoSocket = new WebSocket(VIDEO_WS_URL);

            this.videoSocket.onopen = () => {
                console.log('Video WebSocket Connected');
                this.videoConnected = true;
                this.notifyVideoListeners('connection', { status: 'connected' });
                if (this.videoReconnectTimer) {
                    clearInterval(this.videoReconnectTimer);
                    this.videoReconnectTimer = null;
                }
            };

            this.videoSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'video_frame') {
                        // Debug the incoming video frame
                        console.log('Received video frame:', {
                            type: message.type,
                            camera: message.camera,
                            hasData: !!message.data,
                            timestamp: message.timestamp,
                            fps: message.fps
                        });
                        
                        // Pass the complete message to listeners
                        this.notifyVideoListeners(message.type, message);
                    } else if (message.type === 'camera_stats') {
                        // Handle camera statistics
                        this.notifyVideoListeners('camera_stats', message.data);
                    }
                } catch (error) {
                    console.error('Video message parsing error:', error);
                    console.error('Raw message:', event.data);
                }
            };

            this.videoSocket.onerror = (error) => {
                console.error('Video WebSocket Error:', error);
                this.notifyVideoListeners('error', { error: error.message });
            };

            this.videoSocket.onclose = () => {
                console.log('Video WebSocket Disconnected');
                this.videoConnected = false;
                this.videoSocket = null;
                this.notifyVideoListeners('connection', { status: 'disconnected' });
                this.startVideoReconnection();
            };

        } catch (error) {
            console.error('Video connection error:', error);
            this.startVideoReconnection();
        }
    }

    startVideoReconnection() {
        if (!this.videoReconnectTimer) {
            this.videoReconnectTimer = setInterval(() => {
                console.log('Attempting to reconnect video...');
                this.connectVideo();
            }, 2000);
        }
    }

    disconnectVideo() {
        if (this.videoReconnectTimer) {
            clearInterval(this.videoReconnectTimer);
            this.videoReconnectTimer = null;
        }
        if (this.videoSocket) {
            this.videoSocket.close();
            this.videoSocket = null;
        }
        this.videoConnected = false;
    }

    // Listener management
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    unsubscribe(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    subscribeVideo(event, callback) {
        if (!this.videoListeners.has(event)) {
            this.videoListeners.set(event, new Set());
        }
        this.videoListeners.get(event).add(callback);
        console.log(`Subscribed to ${event}, total listeners: ${this.videoListeners.get(event).size}`);
    }

    unsubscribeVideo(event, callback) {
        if (this.videoListeners.has(event)) {
            this.videoListeners.get(event).delete(callback);
        }
    }

    // Notification methods
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in listener for event ${event}:`, error);
                }
            });
        }
    }

    notifyVideoListeners(event, data) {
        if (this.videoListeners.has(event)) {
            console.log(`Notifying ${this.videoListeners.get(event).size} listeners for video event: ${event}`);
            this.videoListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in video listener for event ${event}:`, error);
                }
            });
        }
    }

    // Connection status
    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    isVideoConnected() {
        return this.videoSocket && this.videoSocket.readyState === WebSocket.OPEN;
    }
}

const socketManager = new SocketManager();
export default socketManager;