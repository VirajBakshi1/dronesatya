import { io } from 'socket.io-client';

const SOCKET_URL = 'http://172.29.172.210:5001';

class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('Connected to drone');
            this.connected = true;
            this.notifyListeners('connection', { status: 'connected' });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from drone');
            this.connected = false;
            this.notifyListeners('connection', { status: 'disconnected' });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.notifyListeners('error', { error });
        });

        // Add listeners for your existing events
        this.socket.on('telemetry', (data) => {
            this.notifyListeners('telemetry', data);
        });

        this.socket.on('pwm_values', (data) => {
            this.notifyListeners('pwm_values', data);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
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

    sendCommand(command, params = {}) {
        if (!this.socket?.connected) {
            console.error('Not connected to drone');
            return false;
        }
        this.socket.emit('command', { command, params });
        return true;
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

const socketManager = new SocketManager();
export default socketManager;
