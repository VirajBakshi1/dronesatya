// socketManager.js
const WS_URL = 'ws://172.29.172.210:5001/ws';

class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
        this.reconnectInterval = null;
    }

    connect() {
        if (this.socket) return;

        try {
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('Connected to drone');
                this.connected = true;
                this.notifyListeners('connection', { status: 'connected' });
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };

            this.socket.onclose = () => {
                console.log('Disconnected from drone');
                this.connected = false;
                this.notifyListeners('connection', { status: 'disconnected' });
                this.reconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.notifyListeners('error', { error });
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const { type, data: payload } = data;
                    
                    switch (type) {
                        case 'telemetry':
                            this.notifyListeners('telemetry', payload);
                            break;
                        case 'drone_state':
                            this.notifyListeners('drone_state', payload);
                            break;
                        case 'command_response':
                            this.notifyListeners('command_response', payload);
                            break;
                        case 'pwm_values':
                            this.notifyListeners('pwm_values', payload);
                            break;
                        case 'error':
                            this.notifyListeners('error', payload);
                            break;
                    }
                } catch (error) {
                    console.error('Message parsing error:', error);
                }
            };
        } catch (error) {
            console.error('Connection error:', error);
            this.reconnect();
        }
    }

    reconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                if (!this.connected) {
                    console.log('Attempting to reconnect...');
                    this.connect();
                }
            }, 2000); // Try every 2 seconds
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    sendCommand(command, params = {}) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('Not connected to drone');
            return false;
        }
        
        const message = {
            type: 'command',
            payload: { command, params }
        };
        
        this.socket.send(JSON.stringify(message));
        return true;
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
        return this.connected && this.socket?.readyState === WebSocket.OPEN;
    }
}

const socketManager = new SocketManager();
export default socketManager;
