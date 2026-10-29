'use client';

import { useEffect, useRef } from 'react';

interface Slot {
  _id: string;
  slotLabel: string;
  polygonCoords: { x: number; y: number }[];
  status: 'empty' | 'occupied' | 'reserved';
}

interface CCTVPanelProps {
  streamUrl?: string; // Could be WebRTC url or static video for demo
  slots: Slot[];
  title: string;
}

export default function CCTVPanel({ streamUrl, slots, title }: CCTVPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw overlay polygons
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      slots.forEach(slot => {
        if (!slot.polygonCoords || slot.polygonCoords.length < 3) return;

        ctx.beginPath();
        // Assume coords are percentages (0-100)
        slot.polygonCoords.forEach((pt, i) => {
          const x = (pt.x / 100) * canvas.width;
          const y = (pt.y / 100) * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        // Styles based on status
        let fillColor = 'rgba(34, 197, 94, 0.2)'; // Emerald (Empty)
        let strokeColor = 'rgb(34, 197, 94)';

        if (slot.status === 'occupied') {
          fillColor = 'rgba(239, 68, 68, 0.2)'; // Red
          strokeColor = 'rgb(239, 68, 68)';
        } else if (slot.status === 'reserved') {
          fillColor = 'rgba(245, 158, 11, 0.2)'; // Amber
          strokeColor = 'rgb(245, 158, 11)';
        }

        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        const centerX = slot.polygonCoords.reduce((acc, pt) => acc + (pt.x / 100) * canvas.width, 0) / slot.polygonCoords.length;
        const centerY = slot.polygonCoords.reduce((acc, pt) => acc + (pt.y / 100) * canvas.height, 0) / slot.polygonCoords.length;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(centerX - 12, centerY - 10, 24, 20);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(slot.slotLabel, centerX, centerY);
      });
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [slots]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-2 bg-gray-950 flex justify-between items-center border-b border-gray-800">
        <span className="text-xs font-medium text-gray-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {title}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">LIVE / 1080p / 30fps</span>
      </div>
      <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden">
        {/* Synthetic "Video" feed for demo purposes */}
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] bg-[length:100%_4px] pointer-events-none" />
          {/* Moving scanner bar */}
          <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent animate-[ping_4s_ease-in-out_infinite] -translate-y-1/2 top-1/2 pointer-events-none" />
          
          <div className="text-gray-400 font-mono text-xs text-center px-4 z-10 relative bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl flex items-center gap-4">
            <div className="flex flex-col gap-1 items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20" />
            </div>
            <div className="text-left">
               <span className="text-gray-200 font-semibold tracking-wider">LIVE FEED SIGNAL</span><br/>
               <span className="text-[10px] text-gray-500 tracking-widest">(AI SIMULATION)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Top edge shadow for realism */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
