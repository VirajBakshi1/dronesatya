import React, { useState, useEffect, useRef } from 'react';
import { Radio, SignalHigh, Video, Gauge } from 'lucide-react';
import socketManager from '../utils/socketManager';

// Update these constants at the top of your component
const SNAP_THRESHOLD = 200;  // Increased from 150 to 200 for stronger snap
const EDGE_PADDING = 16;

const SystemStatusMonitor = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [stats, setStats] = useState({
    backendConnected: false,
    mavrosConnected: false,
    teensyConnected: false,
    videoLatency: 0,
    networkLatency: 0,
    payloadStatus: 'UNKNOWN',
    bandwidth: {
      control: 0,
      video: 0,
      total: 0,
      peak: 0
    }
  });

  // State for dragging
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('monitorPosition');
    return saved ? JSON.parse(saved) : { x: EDGE_PADDING, y: EDGE_PADDING };
  });
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const latencyBuffers = useRef({
    video: [],
    network: []
  });
  const pingTimestamp = useRef(null);
  const pingInterval = useRef(null);
  const bandwidthRef = useRef({
    bytesReceived: 0,
    videoBytesReceived: 0,
    lastCheck: Date.now(),
    interval: null
  });
  const dragRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hoverTimeout = useRef(null);

  const pulseAnimation = `
    @keyframes floatPulse {
      0% { transform: translate(0, 0); }
      50% { transform: translate(0, -3px); }
      100% { transform: translate(0, 0); }
    }
  `;

  // Your existing snapToCorner function remains exactly the same
  const snapToCorner = (x, y, width, height) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const quarterWidth = windowWidth / 3;
    const quarterHeight = windowHeight / 3;

    const calculateCornerPull = (corner) => {
      let cornerX, cornerY;
      switch(corner) {
        case 'topLeft':
          cornerX = EDGE_PADDING;
          cornerY = EDGE_PADDING;
          break;
        case 'topRight':
          cornerX = windowWidth - width - EDGE_PADDING;
          cornerY = EDGE_PADDING;
          break;
        case 'bottomLeft':
          cornerX = EDGE_PADDING;
          cornerY = windowHeight - height - EDGE_PADDING;
          break;
        case 'bottomRight':
          cornerX = windowWidth - width - EDGE_PADDING;
          cornerY = windowHeight - height - EDGE_PADDING;
          break;
      }

      const distX = x - cornerX;
      const distY = y - cornerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      return {
        distance,
        x: cornerX,
        y: cornerY,
        pull: Math.max(0, 1 - distance / SNAP_THRESHOLD)
      };
    };

    const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const pulls = corners.map(corner => ({
      corner,
      ...calculateCornerPull(corner)
    }));

    const strongestPull = pulls.reduce((a, b) =>
      a.pull > b.pull ? a : b
    );

    if (strongestPull.pull > 0.1) {
      const newX = x + (strongestPull.x - x) * strongestPull.pull;
      const newY = y + (strongestPull.y - y) * strongestPull.pull;

      const pos = {
        x: Math.round(newX),
        y: Math.round(newY)
      };

      localStorage.setItem('monitorPosition', JSON.stringify(pos));
      return pos;
    }

    const boundedPos = {
      x: Math.max(EDGE_PADDING, Math.min(windowWidth - width - EDGE_PADDING, x)),
      y: Math.max(EDGE_PADDING, Math.min(windowHeight - height - EDGE_PADDING, y))
    };

    localStorage.setItem('monitorPosition', JSON.stringify(boundedPos));
    return boundedPos;
  };

  // Mouse event handlers
  const handleMouseEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => {
      if (!isExpanded) {
        setIsHovered(true);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setIsHovered(false);
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    setIsHovered(false);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const rect = dragRef.current.getBoundingClientRect();
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    const newPos = snapToCorner(newX, newY, rect.width, rect.height);
    setPosition(newPos);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const rect = dragRef.current.getBoundingClientRect();
    const newPos = snapToCorner(position.x, position.y, rect.width, rect.height);
    setPosition(newPos);
  };

  // Data tracking functions
  const trackDataSize = (data, isVideo = false) => {
    const size = new TextEncoder().encode(JSON.stringify(data)).length;
    if (isVideo) {
      bandwidthRef.current.videoBytesReceived += size;
    } else {
      bandwidthRef.current.bytesReceived += size;
    }
  };

  const updateLatency = (type, value) => {
    if (typeof value !== 'number' || isNaN(value)) return;

    const buffer = latencyBuffers.current[type];
    buffer.push(value);
    if (buffer.length > 5) buffer.shift();

    const sorted = [...buffer].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    setStats(prev => ({
      ...prev,
      [`${type}Latency`]: Math.round(median)
    }));
  };

  // Effects
  useEffect(() => {
    const handleResize = () => {
      if (dragRef.current) {
        const rect = dragRef.current.getBoundingClientRect();
        const newPos = snapToCorner(position.x, position.y, rect.width, rect.height);
        setPosition(newPos);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  useEffect(() => {
    const calculateBandwidth = () => {
      const now = Date.now();
      const elapsed = (now - bandwidthRef.current.lastCheck) / 1000;

      const controlBytesPerSec = bandwidthRef.current.bytesReceived / elapsed;
      const controlKbPerSec = controlBytesPerSec / 1024;

      const videoBytesPerSec = bandwidthRef.current.videoBytesReceived / elapsed;
      const videoKbPerSec = videoBytesPerSec / 1024;

      const totalKbPerSec = controlKbPerSec + videoKbPerSec;

      setStats(prev => ({
        ...prev,
        bandwidth: {
          control: Math.round(controlKbPerSec * 10) / 10,
          video: Math.round(videoKbPerSec * 10) / 10,
          total: Math.round(totalKbPerSec * 10) / 10,
          peak: Math.max(prev.bandwidth.peak, totalKbPerSec)
        }
      }));

      bandwidthRef.current.bytesReceived = 0;
      bandwidthRef.current.videoBytesReceived = 0;
      bandwidthRef.current.lastCheck = now;
    };

    bandwidthRef.current.interval = setInterval(calculateBandwidth, 1000);
    return () => clearInterval(bandwidthRef.current.interval);
  }, []);

  useEffect(() => {
    const handleConnection = (data) => {
      const isConnected = data.status === 'connected';
      setStats(prev => ({
        ...prev,
        backendConnected: isConnected
      }));
      trackDataSize(data);
    };

    const handleTelemetry = (data) => {
      if (!data) return;
      trackDataSize(data);

      setStats(prev => ({
        ...prev,
        mavrosConnected: data.connected || false,
        teensyConnected: data.teensy?.connected || false,
      }));
    };

    const handleVideoFrame = (data) => {
      if (!data?.timestamp) return;
      trackDataSize(data, true);

      const now = Date.now() / 1000;
      const serverTimestamp = data.timestamp;
      const latency = Math.round((now - serverTimestamp) * 1000);

      if (latency > 0 && latency < 10000) {
        updateLatency('video', latency);
      }
    };

    const handleCommandResponse = (data) => {
      trackDataSize(data);
      if (data.command === 'ping' && pingTimestamp.current) {
        const latency = Date.now() - pingTimestamp.current;
        updateLatency('network', latency);
        pingTimestamp.current = null;
      }
    };

    const handleLatchStatus = (data) => {
      trackDataSize(data);
      if (data?.status) {
        setStats(prev => ({
          ...prev,
          payloadStatus: data.status
        }));
      }
    };

    const checkNetworkLatency = () => {
      if (socketManager.isConnected()) {
        pingTimestamp.current = Date.now();
        socketManager.sendCommand('ping').catch(() => {
          updateLatency('network', 999);
        });
      } else {
        updateLatency('network', 999);
      }
    };

    socketManager.connect();
    socketManager.subscribe('connection', handleConnection);
    socketManager.subscribe('telemetry', handleTelemetry);
    socketManager.subscribe('command_response', handleCommandResponse);
    socketManager.subscribe('latch_status', handleLatchStatus);
    socketManager.subscribeVideo('video_frame', handleVideoFrame);

    pingInterval.current = setInterval(checkNetworkLatency, 2000);

    return () => {
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      socketManager.unsubscribe('connection', handleConnection);
      socketManager.unsubscribe('telemetry', handleTelemetry);
      socketManager.unsubscribe('command_response', handleCommandResponse);
      socketManager.unsubscribe('latch_status', handleLatchStatus);
      socketManager.unsubscribeVideo('video_frame', handleVideoFrame);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, []);

  const getLatencyColor = (latency) => {
    if (latency === 0) return 'text-gray-400';
    if (latency < 100) return 'text-green-400';
    if (latency < 200) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
        transition: isDragging
          ? 'none'
          : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isDragging ? 'grabbing' : 'grab',
        animation: !isDragging ? 'floatPulse 3s ease-in-out infinite' : 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="select-none"
    >
      <style>{pulseAnimation}</style>
      <div
        className={`
          bg-slate-900/50 backdrop-blur-sm border border-gray-800
          rounded-lg shadow-lg shadow-slate-900/50
          transition-all duration-500 ease-in-out transform
          ${(isExpanded || isHovered)
            ? 'scale-100 opacity-100 p-3'
            : 'p-2 opacity-90 hover:opacity-100'
          }
        `}
      >
        {/* Collapsed View */}
        <div
          className={`
            transition-all duration-500 ease-in-out transform
            ${!isExpanded && !isHovered
              ? 'scale-100 opacity-100'
              : 'scale-0 opacity-0 absolute'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${stats.backendConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <div className={`w-1.5 h-1.5 rounded-full ${stats.mavrosConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <div className={`w-1.5 h-1.5 rounded-full ${stats.teensyConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              </div>
              <span className={`text-xs font-mono ${getLatencyColor(stats.networkLatency)}`}>
                {stats.networkLatency}ms
              </span>
            </div>
          </div>
  
          {/* Expanded View */}
          <div
            className={`
              transition-all duration-500 ease-in-out transform
              ${(isExpanded || isHovered)
                ? 'scale-100 opacity-100'
                : 'scale-95 opacity-0 absolute'
              }
            `}
          >
            <div className="space-y-1.5 min-w-[180px]">
              {/* Connection Status Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs tracking-wider text-gray-400 font-light">CONN:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${stats.backendConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-light">GPU</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${stats.mavrosConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-light">FCU</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${stats.teensyConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-light">BAY</span>
                  </div>
                </div>
              </div>
  
              {/* Divider */}
              <div className="border-t border-gray-800" />
  
              {/* Latencies Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SignalHigh className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs tracking-wider text-gray-400 font-light">NET:</span>
                  </div>
                  <span className={`text-xs font-mono ${getLatencyColor(stats.networkLatency)}`}>
                    {stats.networkLatency}ms
                  </span>
                </div>
  
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs tracking-wider text-gray-400 font-light">VIDEO:</span>
                  </div>
                  <span className={`text-xs font-mono ${getLatencyColor(stats.videoLatency)}`}>
                    {stats.videoLatency}ms
                  </span>
                </div>
              </div>
  
              {/* Divider */}
              <div className="border-t border-gray-800" />
  
              {/* Payload Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-gray-400 font-light">BAY:</span>
                <span className="text-[10px] font-mono tracking-wider text-blue-400 uppercase">
                  {stats.payloadStatus}
                </span>
              </div>
  
              {/* Divider */}
              <div className="border-t border-gray-800" />
  
              {/* Bandwidth Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs tracking-wider text-gray-400 font-light">BW:</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-wider text-gray-500 font-light">CTL:</span>
                    <span className="text-[10px] font-mono tracking-wider text-blue-400">
                      {stats.bandwidth.control} KB/s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-wider text-gray-500 font-light">VID:</span>
                    <span className="text-[10px] font-mono tracking-wider text-blue-400">
                      {stats.bandwidth.video} KB/s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-wider text-gray-500 font-light">PEAK:</span>
                    <span className="text-[9px] font-mono tracking-wider text-gray-400">
                      {Math.round(stats.bandwidth.peak)} KB/s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default SystemStatusMonitor;