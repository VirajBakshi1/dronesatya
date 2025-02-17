import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../utils/socketManager';

const DroneHealth = () => {
  const [mavrosOutput, setMavrosOutput] = useState([]);
  const outputRef = useRef(null);

  useEffect(() => {
    console.log("DroneHealth: Initializing..."); // Debug print

    socketManager.connect();
    console.log("DroneHealth: Socket connection initiated");

    const handleMavrosOutput = (data) => {
      console.log("DroneHealth: Raw MAVROS data received:", data); // More detailed debug
      console.log("DroneHealth: Data type:", data?.type);          // Check message type
      console.log("DroneHealth: Data content:", data?.data);       // Check data structure

      if (data?.data?.output) {
        console.log("DroneHealth: Adding output to state:", data.data.output); // Debug print
        setMavrosOutput(prev => {
          console.log("DroneHealth: Previous outputs:", prev); // Debug print
          return [...prev, data.data.output];
        });

        // Auto-scroll to bottom
        if (outputRef.current) {
          console.log("DroneHealth: Scrolling to bottom"); // Debug print
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      } else {
        console.log("DroneHealth: Received data but no output found in structure"); // Debug print
      }
    };

    socketManager.subscribe('mavros_output', handleMavrosOutput);
    console.log("DroneHealth: Subscribed to mavros_output");

    // Debug the socket connection status
    console.log("DroneHealth: Socket state:", socketManager.socket?.connected);

    return () => {
      console.log("DroneHealth: Cleaning up..."); // Debug print
      socketManager.unsubscribe('mavros_output', handleMavrosOutput);
      console.log("DroneHealth: Unsubscribed from mavros_output");
    };
  }, []);

  // Debug render
  console.log("DroneHealth: Current output array length:", mavrosOutput.length);

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/50 text-white rounded-lg shadow-lg border border-gray-800 backdrop-blur-sm shadow-slate-900/50">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-xl tracking-wider font-light">MAVROS HEALTH</h2>
          </div>
          <span className="text-xs px-3 py-1 bg-green-500/20 text-green-300 rounded-md border border-green-500/30 tracking-wider">
            LIVE OUTPUT
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Terminal Output - Enhanced with better scrollbar and background */}
        <div
          ref={outputRef}
          className="bg-slate-950 rounded-lg p-6 h-64 w-full overflow-x-auto overflow-y-auto font-mono text-sm whitespace-pre border border-gray-800"
          style={{
            maxWidth: '100vw',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 #1F2937',
            overflowY: 'auto'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #0F172A;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: #1E293B;
              border-radius: 4px;
              border: 1px solid #334155;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #334155;
            }
          `}</style>
          {mavrosOutput.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 tracking-wider font-light">
                AWAITING MAVROS DATA...
              </p>
            </div>
          ) : (
            mavrosOutput.map((line, index) => (
              <div key={index} className="text-gray-300 min-w-max font-light tracking-wide">
                <span className="text-blue-400 mr-2">→</span>
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="px-6 pb-4 text-xs text-gray-400 tracking-wider">
        <p>MAVROS Output Monitor • {mavrosOutput.length} messages received</p>
      </div>
    </div>
  );
};

export default DroneHealth;