// socketManager.js

const WS_URL = 'ws://172.29.172.210:5001/ws';

class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
        this.reconnectTimer = null;
    }

    connect() {
        if (this.socket) return;

        try {
            console.log('Connecting to WebSocket...');
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('WebSocket Connected');
                this.connected = true;
                this.notifyListeners('connection', { status: 'connected' });
                if (this.reconnectTimer) {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.socket.onclose = () => {
                console.log('WebSocket Disconnected');
                this.connected = false;
                this.socket = null;
                this.notifyListeners('connection', { status: 'disconnected' });
                this.startReconnection();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                this.notifyListeners('error', { error: error.message });
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type) {
                        this.notifyListeners(message.type, message.data);
                    }
                } catch (error) {
                    console.error('Message parsing error:', error);
                }
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.startReconnection();
        }
    }

    startReconnection() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setInterval(() => {
                console.log('Attempting to reconnect...');
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
            console.error('Not connected to WebSocket');
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

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}

const socketManager = new SocketManager();
export default socketManager;
