'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { UploadCloud, Play, Square, Settings, Cpu } from 'lucide-react';
// Mocking: Comment out live CCTV ML models
// import '@tensorflow/tfjs';
// import * as cocoSsd from '@tensorflow-models/coco-ssd';

function isPointInPolygon(point: number[], vs: number[][]) {
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function EdgeTestFeedPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  // const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false); // mock doesn't need to load

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqFrame = useRef<number>(0);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  const occupiedSlotIdsRef = useRef<Set<string>>(new Set());
  const lastDatabaseStateRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Mocking: Assume model loading is instant for testing
    // cocoSsd.load().then(mdl => {
    //   setModel(mdl);
    //   setIsModelLoading(false);
    //   toast.success('TensorFlow.js COCO-SSD loaded');
    // }).catch(err => {
    //   console.error(err);
    //   toast.error('Failed to load TFJS model');
    // });
    setTimeout(() => {
      setIsModelLoading(false);
      toast.success('Mock ML Engine Ready (Live CCTV disabled)');
    }, 500);

    api.get('/api/parking').then(res => {
      setLocations(res.data.locations || []);
      if (res.data.locations?.length > 0) setLocationId(res.data.locations[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    api.get(`/api/slots/${locationId}`).then(res => {
      const fetchedSlots = res.data.slots || [];
      setSlots(fetchedSlots);
      const stateObj: Record<string, string> = {};
      fetchedSlots.forEach((s: any) => { stateObj[s._id] = s.status; });
      lastDatabaseStateRef.current = stateObj;
    });
  }, [locationId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('video/')) {
      setFile(f);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(f));
    }
    else toast.error('Please select a valid video file');
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current /*|| !model*/) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.videoWidth === 0 || video.paused || video.ended) {
      reqFrame.current = requestAnimationFrame(detectFrame);
      return;
    }

    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaledSlots = slots.map(slot => {
       const points = slot.polygonCoords.map((p: any) => [(p.x / 100) * canvas.width, (p.y / 100) * canvas.height]);
       return { ...slot, points };
    });

    // Mocking: We skip real prediction logic and just draw the slots
    // const predictions = await model.detect(video);
    // ... disabled real ML inference ...

    // Draw the mock simulation state instead
    scaledSlots.forEach(slot => {
        const isOccupied = occupiedSlotIdsRef.current.has(slot._id);
        const isReserved = slot.status === 'reserved';
        
        ctx.beginPath();
        slot.points.forEach((p: number[], i: number) => {
           if(i===0) ctx.moveTo(p[0], p[1]);
           else ctx.lineTo(p[0], p[1]);
        });
        ctx.closePath();
        
        let strokeColor = '#10b981';
        let fillColor = 'rgba(16, 185, 129, 0.3)';
        
        if (isReserved) {
            strokeColor = '#f59e0b';
            fillColor = 'rgba(245, 158, 11, 0.3)';
        } else if (isOccupied) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.3)';
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = fillColor;
        ctx.fill();

        const cx = slot.points.reduce((sum: number, p: number[]) => sum + p[0], 0) / slot.points.length;
        const cy = slot.points.reduce((sum: number, p: number[]) => sum + p[1], 0) / slot.points.length;
        ctx.fillStyle = 'white';
        ctx.fillText(slot.slotLabel, cx - 10, cy);
    });
    
    reqFrame.current = requestAnimationFrame(detectFrame);
  };

  const syncToBackend = useCallback(() => {
      // Mocking: Instead of fetching from occupiedSlotIdsRef (ML output), 
      // we randomly simulate occupancy logic here to test.
      let changes = 0;
      slots.forEach(slot => {
        if (slot.status === 'reserved') return; // Can't park in reserved during random testing unless verifying flow
        
        // Randomly decide to toggle an empty/occupied status just for testing
        // to mimic cars coming and going
        if (Math.random() > 0.85) {
          const isActuallyOccupied = lastDatabaseStateRef.current[slot._id] !== 'occupied';
          
          if (isActuallyOccupied) occupiedSlotIdsRef.current.add(slot._id);
          else occupiedSlotIdsRef.current.delete(slot._id);

          const newStatus = isActuallyOccupied ? 'occupied' : 'empty';
          changes++;
          lastDatabaseStateRef.current[slot._id] = newStatus;
          api.patch(`/api/slots/${slot._id}/status`, { status: newStatus }).catch(console.error);
          addLog(`Slot ${slot.slotLabel} detected as ${newStatus.toUpperCase()} (Mock)`);
        }
      });

      if (changes === 0 && slots.length > 0) {
         addLog(`Scanning ${slots.length} slots... No status changes.`);
      } else if (slots.length === 0) {
         addLog(`YOLOv8 Mock Engine Running... No slots configured for this location.`);
      }
  }, [slots]);

  useEffect(() => {
      if (isPlaying) {
          reqFrame.current = requestAnimationFrame(detectFrame);
          syncInterval.current = setInterval(syncToBackend, 4000); // Trigger mock updates every 4 seconds
      } else {
          cancelAnimationFrame(reqFrame.current);
          if (syncInterval.current) clearInterval(syncInterval.current);
      }
      return () => {
          cancelAnimationFrame(reqFrame.current);
          if (syncInterval.current) clearInterval(syncInterval.current);
      };
  }, [isPlaying, slots, syncToBackend]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-orange-500" />
            Edge ML Inference Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">Natively executing TensorFlow.js COCO-SSD object detection</p>
        </div>
        <select
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded-xl text-sm focus:border-orange-500 outline-none"
        >
          {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm overflow-hidden">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl hover:border-orange-500 hover:bg-gray-800/50 transition-all cursor-pointer relative">
              <input type="file" accept="video/*" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="h-12 w-12 text-gray-500 mb-4" />
              <p className="text-white font-medium mb-1">Upload Test Video</p>
              <p className="text-xs text-gray-500 mb-4">MP4, WebM up to 50MB</p>
              <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors">
                Browse Files
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 bg-black rounded-xl overflow-hidden relative">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-contain"
                  loop muted playsInline
                  onEnded={() => setIsPlaying(false)}
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {!isModelLoading && isPlaying && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700 z-10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-white">Mock Detection Live (CCTV Disabled)</span>
                  </div>
                )}
                {isModelLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm flex-col z-20">
                     <span className="text-orange-500 animate-pulse text-lg mb-2">Loading Neural Network...</span>
                     <span className="text-xs text-gray-400 font-mono">Fetching COCO-SSD Weights (~30MB)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} disabled={isModelLoading} className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-orange-600 hover:bg-orange-500 text-white shadow-lg disabled:opacity-50">
                    {isPlaying ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / (1024*1024)).toFixed(2)} MB • Local File</p>
                  </div>
                </div>
                <button onClick={() => { setFile(null); setVideoUrl(''); setIsPlaying(false); }} className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  Change File
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-gray-400" />
              Inference Logs
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded pl-1.5 flex items-center gap-1 ${isPlaying ? 'bg-emerald-950 text-emerald-500' : 'bg-gray-800 text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              {isPlaying ? 'Processing' : 'Idle'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-black/50 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-600 text-center mt-10">Start inference engine to see live stream logs</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-2 break-all border-l-2 pl-2 border-gray-700">
                  <span className="text-orange-400">{log.split('] ')[0]}]</span>
                  <span className={log.includes('OCCUPIED') ? 'text-red-400 ml-2' : 'text-emerald-400 ml-2'}>
                    {log.split('] ')[1]}
                  </span>
                </div>
              ))
            )}
          </div>
          {logs.length > 0 && (
            <div className="p-3 border-t border-gray-800 bg-gray-950">
               <button onClick={() => setLogs([])} className="w-full py-1.5 text-xs text-gray-400 hover:text-white border border-gray-800 rounded hover:bg-gray-800 transition-colors">
                 Clear Logs
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
