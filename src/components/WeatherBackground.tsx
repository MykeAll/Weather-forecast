import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Globe from 'react-globe.gl';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Cloud, Globe as GlobeIcon } from 'lucide-react';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export type WeatherBackgroundMode = 'atmosphere' | 'globe' | 'radar';

interface WeatherBackgroundProps {
  atmosphere: string;
  isDay: boolean;
  latitude?: number;
  longitude?: number;
  mode?: WeatherBackgroundMode;
  intensity?: number; // 0 to 1
}

const atmosphereStyles: Record<string, string> = {
  clear: "from-sky-400 via-blue-500 to-sky-600",
  clearNight: "from-[#02040a] via-[#0b1120] to-[#010203]",
  cloudy: "from-[#8e9eab] to-[#eef2f3]",
  cloudyNight: "from-[#141e30] to-[#243b55]",
  rain: "from-[#2c3e50] via-[#1a2a3a] to-[#050a10]",
  rainNight: "from-[#050510] to-[#000000]",
  snow: "from-[#f2f2f2] to-[#cfd9df]",
  snowNight: "from-[#1a1c2c] to-[#0a0a10]",
  thunderstorm: "from-[#0f0c29] via-[#1a1a2e] to-[#0a0a1a]",
  thunderstormNight: "from-[#050510] to-[#000000]",
  fog: "from-[#bdc3c7] to-[#2c3e50]",
  fogNight: "from-[#141e30] to-[#0a0a1a]",
};

// --- Star Field Component ---
const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { 
      x: number; 
      y: number; 
      size: number; 
      alpha: number; 
      speed: number; 
      drift: number;
      type: 'twinkle' | 'flash' | 'fade';
      wait: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 6000), 150);
      for (let i = 0; i < count; i++) {
        const typeRand = Math.random();
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random(),
          speed: Math.random() * 0.015 + 0.005, // Faster twinkling
          drift: Math.random() * 0.03 + 0.01,
          type: typeRand > 0.9 ? 'flash' : (typeRand > 0.6 ? 'fade' : 'twinkle'),
          wait: Math.random() * 100
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        // Twinkle logic based on type
        if (star.type === 'twinkle') {
          star.alpha += star.speed;
          if (star.alpha > 1 || star.alpha < 0.2) star.speed *= -1;
        } else if (star.type === 'flash') {
          star.wait--;
          if (star.wait <= 0) {
            star.alpha = 1;
            star.wait = Math.random() * 200 + 100;
          } else {
            star.alpha *= 0.95;
          }
        } else {
          star.alpha += star.speed * 0.5;
          if (star.alpha > 0.8 || star.alpha < 0.1) star.speed *= -1;
        }
        
        // Subtle drift
        star.x += star.drift;
        if (star.x > canvas.width) star.x = 0;

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, star.alpha)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        if (star.size > 1) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'white';
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

// --- Rain Effect Component with Splashes ---
const RainEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let drops: { x: number; y: number; length: number; speed: number; opacity: number }[] = [];
    let splashes: { x: number; y: number; r: number; rMax: number; alpha: number }[] = [];

    const dropCount = Math.floor(intensity * 100);

    const initDrops = () => {
      drops = [];
      for (let i = 0; i < dropCount; i++) {
        drops.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          length: Math.random() * 15 + 10,
          speed: (Math.random() * 12 + 8) * (0.5 + intensity * 0.5),
          opacity: Math.random() * 0.2 + 0.1,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;

      // Draw Drops
      drops.forEach((drop) => {
        ctx.strokeStyle = `rgba(180, 200, 230, ${drop.opacity * intensity})`;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        if (drop.y > canvas.height - 20) {
          // Create splash
          if (Math.random() < 0.6) { // Increased frequency
            splashes.push({
              x: drop.x,
              y: canvas.height - 10 + Math.random() * 10,
              r: 0.5,
              rMax: Math.random() * 15 + 8, // Larger splashes
              alpha: 0.7 // Higher initial visibility
            });
          }
          drop.y = -drop.length;
          drop.x = Math.random() * canvas.width;
        }
      });

      // Draw Splashes
      ctx.lineWidth = 0.5;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha * intensity})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        s.r += 0.5;
        s.alpha -= 0.02;
        if (s.alpha <= 0 || s.r >= s.rMax) {
          splashes.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />;
};

// --- Snow Effect Component ---
const SnowEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let flakes: { x: number; y: number; r: number; d: number; speed: number; shimmer: number; shimmerSpeed: number }[] = [];

    const flakeCount = Math.floor(intensity * 80);

    const initFlakes = () => {
      flakes = [];
      for (let i = 0; i < flakeCount; i++) {
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 3 + 1, // radius
          d: Math.random() * flakeCount, // density
          speed: Math.random() * 0.8 + 0.5,
          shimmer: Math.random(),
          shimmerSpeed: Math.random() * 0.02 + 0.01
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initFlakes();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();

      flakes.forEach((f) => {
        f.shimmer += f.shimmerSpeed;
        const opacity = 0.4 + Math.abs(Math.sin(f.shimmer)) * 0.4;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * intensity})`;
        ctx.moveTo(f.x, f.y);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
        ctx.fill();

        f.y += Math.cos(f.d) + 1 + f.r / 2;
        f.x += Math.sin(f.d) * 2;

        if (f.x > canvas.width + 5 || f.x < -5 || f.y > canvas.height) {
          f.x = Math.random() * canvas.width;
          f.y = -10;
        }
      });
      
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />;
};

// --- Sun Glare Component ---
const SunGlare: React.FC = () => {
  return (
    <div className="absolute top-[10%] left-[15%] pointer-events-none z-10">
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 90]
        }}
        transition={{ 
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-96 h-96 bg-white/20 blur-[80px] rounded-full flex items-center justify-center"
      >
        <div className="w-32 h-32 bg-white/40 blur-[40px] rounded-full" />
      </motion.div>
    </div>
  );
};

// --- Realistic Lightning Bolt Component ---
const LightningBolt: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const startX = Math.random() * canvas.width;
    const startY = 0;
    
    // Generate segments
    const segments: { x: number; y: number }[] = [{ x: startX, y: startY }];
    let curX = startX;
    let curY = startY;
    const iterations = 15 + Math.random() * 15;
    const step = canvas.height / iterations;

    for (let i = 0; i < iterations; i++) {
      curX += (Math.random() - 0.5) * 150;
      curY += step;
      segments.push({ x: curX, y: curY });
      
      // Random branch
      if (Math.random() < 0.2) {
        let bX = curX;
        let bY = curY;
        const bLen = 5 + Math.random() * 10;
        for (let j = 0; j < bLen; j++) {
           bX += (Math.random() - 0.5) * 100;
           bY += step * 0.7;
           // We'll draw these inline
        }
      }
    }

    let alpha = 1;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(150, 180, 255, 1)';
      
      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i++) {
        ctx.lineTo(segments[i].x, segments[i].y);
      }
      ctx.stroke();

      alpha -= 0.08;
      if (alpha > 0) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animate();
  }, [onComplete]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-30 pointer-events-none" />;
};

// --- Lightning Controller Component ---
const Lightning: React.FC = () => {
  const [opacity, setOpacity] = React.useState(0);
  const [activeBolts, setActiveBolts] = React.useState<number[]>([]);

  useEffect(() => {
    let timeoutId: any;

    const triggerLightning = () => {
      const type = Math.random();
      
      // Trigger bolt component
      if (Math.random() < 0.7) {
        setActiveBolts(prev => [...prev, Date.now()]);
      }

      if (type < 0.6) {
        flash(0.8, 50, () => flash(0, 100));
      } else if (type < 0.9) {
        flash(1, 40, () => flash(0, 50, () => flash(0.7, 40, () => flash(0, 150))));
      } else {
        flash(0.5, 30, () => flash(0.2, 30, () => flash(0.9, 30, () => flash(0.3, 30, () => flash(0, 200)))));
      }

      const nextDelay = Math.random() * 6000 + 2000; // More frequent in stormy conditions
      timeoutId = window.setTimeout(triggerLightning, nextDelay);
    };

    const flash = (val: number, duration: number, callback?: () => void) => {
      setOpacity(val);
      window.setTimeout(() => {
        if (callback) callback();
        else setOpacity(0);
      }, duration);
    };

    timeoutId = window.setTimeout(triggerLightning, 3000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <motion.div
        animate={{ opacity }}
        transition={{ duration: 0.1 }}
        className="absolute inset-0 bg-white/20 mix-blend-overlay z-20 pointer-events-none"
      />
      {activeBolts.map(id => (
        <LightningBolt key={id} onComplete={() => setActiveBolts(prev => prev.filter(b => b !== id))} />
      ))}
    </>
  );
};

// --- Radar Map Component ---
const RadarMap: React.FC<{ lat: number, lon: number }> = ({ lat, lon }) => {
  const [layer, setLayer] = useState<'precipitation_new' | 'temp_new' | 'wind_new'>('precipitation_new');
  const [opacity, setOpacity] = useState(0.8);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Manually update opacity if prop doesn't sync perfectly
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
      map.setView([lat, lon], 7);
    }, [map, lat, lon]);
    return null;
  };

  const layers = [
    { id: 'precipitation_new', label: 'Rain', icon: <Cloud size={14} /> },
    { id: 'temp_new', label: 'Temp', icon: <div className="text-[10px] font-bold">°C</div> },
    { id: 'wind_new', label: 'Wind', icon: <div className="text-[10px] font-bold">W</div> }
  ];

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer 
        center={[lat, lon]} 
        zoom={7} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', filter: 'grayscale(0.6) invert(0.9) contrast(1.2) brightness(0.8)' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <TileLayer
          eventHandlers={{
            add: (e) => {
              tileLayerRef.current = e.target;
            }
          }}
          key={layer}
          url={`https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=86940733a1e27a922119777174ba1340`}
          opacity={opacity}
        />
        <MapUpdater />
      </MapContainer>

      {/* Radar Controls */}
      <div className="absolute top-40 left-6 z-40 flex flex-col gap-3 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col gap-1">
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id as any)}
              className={cn(
                "p-3 rounded-xl transition-all flex items-center justify-center gap-2",
                layer === l.id ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
              title={l.label}
            >
              {l.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:block">{l.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex flex-col gap-2">
          <span className="text-[8px] uppercase tracking-widest font-black text-white/30 text-center">Opacity</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            value={opacity} 
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-24 accent-white cursor-pointer"
          />
        </div>

        <button
          onClick={() => mapRef.current?.setView([lat, lon], 7)}
          className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl text-white/40 hover:text-white transition-all flex items-center justify-center"
          title="Re-center"
        >
          <div className="p-0.5 border-2 border-current rounded-full" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-10" />
    </div>
  );
};

// --- Weather Globe Component ---
const WeatherGlobe: React.FC<{ lat: number, lon: number }> = ({ lat, lon }) => {
  const globeRef = useRef<any>();
  
  // Simulated global weather data points using HexBins for a heatmap look
  const hexData = useMemo(() => {
    return [...Array(50)].map(() => ({
      lat: (Math.random() - 0.5) * 160,
      lng: (Math.random() - 0.5) * 360,
      temp: Math.random() * 40 - 10, // -10 to 30
    }));
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 2.2 }, 1500);
      const controls = globeRef.current.controls();
      controls.autoRotate = false;
      controls.enableZoom = true;
      controls.minDistance = 150;
      controls.maxDistance = 1200;
    }
  }, [lat, lon]);

  const handleReset = () => {
    if (globeRef.current) {
      // Use a slightly higher altitude for a full globe view
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 2.5 }, 1200);
      const controls = globeRef.current.controls();
      if (controls) {
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
      }
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden pointer-events-auto">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.15}
        
        hexBinPointsData={hexData}
        hexBinPointWeight="temp"
        hexBinResolution={3}
        hexMargin={0.2}
        hexTopColor={d => d.sumWeight > 20 ? '#f87171' : (d.sumWeight > 5 ? '#fbbf24' : '#38bdf8')}
        hexSideColor={d => d.sumWeight > 20 ? 'rgba(248,113,113,0.2)' : 'rgba(56,189,248,0.2)'}
        hexBinMerge={true}
        
        ringsData={[{ lat, lng: lon }]}
        ringColor={() => "#38bdf8"}
        ringMaxRadius={3}
        ringPropagationSpeed={1.5}
        ringRepeatPeriod={1500}
        
        htmlElementsData={[{ lat, lng: lon }]}
        htmlElement={() => {
          const el = document.createElement('div');
          el.innerHTML = `
            <div class="relative">
              <div class="w-4 h-4 bg-sky-400 border-2 border-white rounded-full shadow-[0_0_20px_rgba(56,189,248,0.8)]"></div>
            </div>
          `;
          return el;
        }}
      />

      <div className="absolute bottom-10 left-10 z-40 bg-black/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#f87171]" />
              <span className="text-[10px] font-bold text-white/60">Warm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
              <span className="text-[10px] font-bold text-white/60">Mild</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />
              <span className="text-[10px] font-bold text-white/60">Cool</span>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <p className="text-[9px] uppercase tracking-widest font-black text-white/40 leading-relaxed">
            Global Atmospheric<br/>Hex-Bin Analysis
          </p>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="absolute bottom-10 right-10 z-40 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-all shadow-2xl flex items-center gap-3 group pointer-events-auto"
      >
        <GlobeIcon size={18} className="group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Reset Camera</span>
      </button>
    </div>
  );
};

// --- Dust Motes Effect for Clear Sky ---
const DustMotes: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let motes: { x: number; y: number; size: number; alpha: number; speedX: number; speedY: number; drift: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initMotes();
    };

    const initMotes = () => {
      motes = [];
      const count = 120;
      for (let i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.4,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          drift: Math.random() * 0.002
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      motes.forEach((mote) => {
        mote.x += mote.speedX;
        mote.y += mote.speedY;
        mote.alpha += mote.drift;
        if (mote.alpha > 0.6 || mote.alpha < 0.05) mote.drift *= -1;

        if (mote.x > canvas.width) mote.x = 0;
        if (mote.x < 0) mote.x = canvas.width;
        if (mote.y > canvas.height) mote.y = 0;
        if (mote.y < 0) mote.y = canvas.height;

        ctx.fillStyle = `rgba(255, 255, 255, ${mote.alpha})`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a very subtle glow to the motes
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-screen" />;
};

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ 
  atmosphere, 
  isDay, 
  latitude = 0, 
  longitude = 0, 
  mode = 'atmosphere',
  intensity = 0.5 
}) => {
  const key = isDay ? atmosphere : `${atmosphere}Night`;
  const gradientClass = atmosphereStyles[key] || atmosphereStyles[isDay ? 'clear' : 'clearNight'];

  // Default intensities based on weather
  const effectiveIntensity = atmosphere === 'thunderstorm' ? 0.8 : (atmosphere === 'rain' ? 0.6 : intensity);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {mode === 'atmosphere' && (
          <motion.div
            key="atmosphere"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-colors duration-1000",
                  gradientClass
                )}
              />
            </AnimatePresence>

            {/* Night Stars */}
            {!isDay && <StarField />}

            {/* Sunny Day Light Rays & Glare */}
            {isDay && atmosphere === 'clear' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <SunGlare />
                <DustMotes />
                {/* Main Light Ray System */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: [0, 360],
                      opacity: [0.05, 0.15, 0.05],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 180 + i * 60, repeat: Infinity, ease: "linear" },
                      opacity: { duration: 12 + i * 4, repeat: Infinity, ease: "easeInOut" },
                      scale: { duration: 15 + i * 5, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute -inset-[50%] blur-[40px]"
                    style={{ 
                      backgroundImage: `conic-gradient(from ${i * 60}deg at 30% 30%, transparent, rgba(255,255,255,0.02) 15%, transparent 30%, rgba(255,255,255,0.02) 45%, transparent)`,
                      backgroundBlendMode: 'overlay'
                    }}
                  />
                ))}
                <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full animate-pulse" />
              </div>
            )}

            {/* Enhanced Clouds Layer with Parallax */}
            {(atmosphere === 'cloudy' || atmosphere === 'fog') && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '-20%', y: (Math.random() * 90) + '%' }}
                    animate={{ x: '120%' }}
                    transition={{
                      duration: 100 + Math.random() * 200, // Even slower for subtlety
                      repeat: Infinity,
                      ease: "linear",
                      delay: -Math.random() * 300
                    }}
                    className={cn(
                      "absolute bg-white/20 blur-[160px] rounded-full",
                      i % 3 === 0 ? "w-[1000px] h-[500px]" : (i % 2 === 0 ? "w-[700px] h-[350px]" : "w-[400px] h-[200px]")
                    )}
                    style={{
                      opacity: 0.03 + Math.random() * 0.1, // Reduced opacity for subtlety
                      scale: 0.8 + Math.random() * 0.5,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Rain Effect */}
            {(atmosphere === 'rain' || atmosphere === 'thunderstorm') && (
              <RainEffect intensity={effectiveIntensity} />
            )}

            {/* Snow Effect */}
            {atmosphere === 'snow' && (
              <SnowEffect intensity={effectiveIntensity} />
            )}

            {/* Lightning for Thunderstorms */}
            {atmosphere === 'thunderstorm' && <Lightning />}

            {/* Atmosphere Mist/Depth Orbs */}
            <div className="absolute inset-0 z-30">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
            </div>
          </motion.div>
        )}

        {mode === 'globe' && (
          <motion.div
            key="globe"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-auto"
          >
            <WeatherGlobe lat={latitude} lon={longitude} />
          </motion.div>
        )}

        {mode === 'radar' && (
          <motion.div
            key="radar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-auto"
          >
            <RadarMap lat={latitude} lon={longitude} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
