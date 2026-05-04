import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Globe from 'react-globe.gl';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Cloud, Globe as GlobeIcon, LocateFixed, Maximize2, CloudRain, Thermometer, Wind } from 'lucide-react';

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
  windSpeed?: number;
  temperature?: number;
  onSunIntensityChange?: (intensity: number) => void;
  sunIntensity?: number;
}

// --- Aurora Effect Component ---
const AuroraEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      time += 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create multiple wispy layers
      for (let i = 0; i < 3; i++) {
        const offset = i * 200;
        const color = i === 0 ? 'rgba(74, 222, 128, 0.1)' : (i === 1 ? 'rgba(168, 85, 247, 0.08)' : 'rgba(34, 197, 94, 0.05)');
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.3 + Math.sin(time + i) * 50);
        
        for (let x = 0; x <= canvas.width; x += 20) {
          const y = canvas.height * 0.3 + 
                    Math.sin(x * 0.001 + time + i) * 100 + 
                    Math.cos(x * 0.002 - time * 0.5) * 50;
          ctx.lineTo(x, y + offset * Math.sin(time * 0.2));
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        
        const gradient = ctx.createLinearGradient(0, canvas.height * 0.2, 0, canvas.height * 0.6);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add some vertical "curtains"
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 10; j++) {
          const xPos = (canvas.width / 10) * j + (Math.sin(time + j) * 50);
          const grad = ctx.createLinearGradient(xPos, canvas.height * 0.1, xPos, canvas.height * 0.5);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(xPos, canvas.height * 0.1, 2, canvas.height * 0.4);
        }
        ctx.globalCompositeOperation = 'source-over';
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
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none opacity-40 mix-blend-screen" />;
};

// --- Volumetric Fog Component ---
const VolumetricFog: React.FC<{ intensity: number }> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; r: number; vx: number; vy: number; alpha: number; noise: number }[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const init = () => {
      particles = [];
      const count = Math.floor(40 * intensity);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height * (0.3 + Math.random() * 0.7),
          r: 200 + Math.random() * 400,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.1,
          alpha: (0.02 + Math.random() * 0.05) * intensity,
          noise: Math.random() * Math.PI * 2
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.noise += 0.002;
        p.x += p.vx + Math.sin(p.noise) * 0.2;
        p.y += p.vy;

        if (p.x < -p.r) p.x = canvas.width + p.r;
        if (p.x > canvas.width + p.r) p.x = -p.r;
        if (p.y < canvas.height * 0.3) p.y = canvas.height;
        if (p.y > canvas.height) p.y = canvas.height * 0.3;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(200, 210, 220, ${p.alpha})`);
        grad.addColorStop(0.5, `rgba(180, 190, 200, ${p.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(180, 190, 200, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
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

  return <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay" />;
};

// --- Sun Intensity Control ---
const SunIntensityControl: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-8 right-6 z-[180] flex flex-col gap-2 p-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl"
    >
      <div className="flex justify-between items-center px-1">
        <span className="text-[8px] uppercase tracking-widest font-black text-white/40">Sun Brilliance</span>
        <span className="text-[9px] font-mono font-bold text-amber-400">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-1 w-32 group/slider">
        <div className="absolute inset-0 rounded-full bg-white/5" />
        <div 
          className="absolute inset-y-0 left-0 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          style={{ width: `${value * 100}%` }}
        />
        <input 
          type="range"
          min="0.2"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer appearance-none z-10"
        />
      </div>
    </motion.div>
  );
};

// --- Heat Haze Component ---
const HeatHaze: React.FC<{ intensity: number; temperature: number }> = ({ intensity, temperature }) => {
  const isHighHeat = temperature > 30;
  // Increase intensity as temperature rises above 30
  const heatFactor = Math.min(2, Math.max(1, (temperature - 25) / 10));
  const scale = isHighHeat ? 40 * intensity * heatFactor : 20 * intensity;
  const frequency = isHighHeat ? "0.03 0.15" : "0.02 0.08";
  
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      <svg className="hidden">
        <filter id="heatHaze">
          <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="4" seed="5">
            <animate 
              attributeName="baseFrequency" 
              dur={isHighHeat ? "2s" : "4s"} 
              values={`${frequency}; 0.02 0.2; ${frequency}`} 
              repeatCount="indefinite" 
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale={scale} />
        </filter>
      </svg>
      <div 
        className={cn(
          "w-full h-full transition-all duration-1000 origin-bottom",
          isHighHeat ? "bg-orange-500/10" : "bg-white/5"
        )} 
        style={{ 
          filter: 'url(#heatHaze)',
          transform: isHighHeat ? 'scale(1.05)' : 'none'
        }} 
      />
    </div>
  );
};

// --- Wind Driven Clouds Component ---
const WindDrivenClouds: React.FC<{ windSpeed: number; condition: string }> = ({ windSpeed, condition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let clouds: { 
      x: number; 
      y: number; 
      scaleX: number; 
      scaleY: number; 
      speed: number; 
      opacity: number; 
      baseSize: number;
      noise: number;
      noiseSpeed: number;
      color: string;
    }[] = [];

    let gustFactor = 1.0;
    let targetGustFactor = 1.0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initClouds();
    };

    const initClouds = () => {
      clouds = [];
      
      // Dynamic settings based on condition
      let count = 14;
      let opacityBase = 0.05;
      let sizeBase = 100;
      let cloudColor = '255, 255, 255';

      if (condition === 'fog') {
        count = 25;
        opacityBase = 0.08;
        sizeBase = 200;
        cloudColor = '220, 230, 240';
      } else if (condition === 'rain' || condition === 'thunderstorm') {
        count = 20;
        opacityBase = 0.12;
        sizeBase = 150;
        cloudColor = '70, 80, 95'; // Darker storm clouds
      } else if (condition === 'cloudy') {
        count = 18;
        opacityBase = 0.07;
        sizeBase = 120;
      }

      for (let i = 0; i < count; i++) {
        clouds.push({
          x: Math.random() * canvas.width,
          y: Math.random() * (canvas.height * 0.7),
          scaleX: (condition === 'fog' ? 4 : 2) + Math.random() * 4,
          scaleY: (condition === 'fog' ? 1.5 : 0.5) + Math.random() * 0.5,
          speed: (windSpeed / 10 + Math.random() * 0.5) * (condition === 'thunderstorm' ? 2 : 1.5),
          opacity: opacityBase + Math.random() * 0.1,
          baseSize: sizeBase + Math.random() * 120,
          noise: Math.random() * Math.PI * 2,
          noiseSpeed: (0.003 + Math.random() * 0.007) * (condition === 'thunderstorm' ? 2 : 1),
          color: cloudColor
        });
      }
    };

    const draw = () => {
      // Wind gust logic
      if (windSpeed > 35 && Math.random() < 0.005 && targetGustFactor === 1.0) {
        targetGustFactor = 1.8 + Math.random() * 1.5;
      }

      // Smoothly transition gust factor
      if (gustFactor < targetGustFactor) {
        gustFactor += 0.015;
      } else {
        gustFactor -= 0.004;
        if (gustFactor < 1.0) {
          gustFactor = 1.0;
          targetGustFactor = 1.0;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      clouds.forEach(c => {
        // Increase noise (swirling) speed during gusts
        const currentNoiseSpeed = c.noiseSpeed * (1 + (gustFactor - 1) * 2.5);
        c.noise += currentNoiseSpeed;
        const currentSize = c.baseSize * (1 + Math.sin(c.noise) * 0.15);
        
        // Organic vertical drift
        c.y += Math.sin(c.noise * 0.5) * (0.2 * gustFactor);

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.scaleX, c.scaleY);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
        gradient.addColorStop(0, `rgba(${c.color}, ${c.opacity})`);
        gradient.addColorStop(0.4, `rgba(${c.color}, ${c.opacity * 0.6})`);
        gradient.addColorStop(0.7, `rgba(${c.color}, ${c.opacity * 0.2})`);
        gradient.addColorStop(1, `rgba(${c.color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // Complexity based on condition
        const points = (condition === 'thunderstorm' ? 8 : 5);
        for(let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2 + c.noise;
          const dist = condition === 'fog' ? 10 : 30;
          const ox = Math.cos(angle) * dist;
          const oy = Math.sin(angle) * (dist/2);
          ctx.moveTo(ox + currentSize, oy);
          ctx.arc(ox, oy, currentSize * (0.8 + Math.random() * 0.4), 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        // Horizontal movement
        c.x += c.speed * gustFactor;
        if (c.x > canvas.width + c.baseSize * 6) {
          c.x = -c.baseSize * 6;
          c.y = Math.random() * (canvas.height * 0.7);
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
  }, [windSpeed, condition]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none mix-blend-screen overflow-hidden" />;
};

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

        const currentAlpha = Math.max(0, star.alpha);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Efficient Glow (avoid shadowBlur)
        if (star.size > 1.2 && currentAlpha > 0.5) {
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fill();
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
    let splashes: { x: number; y: number; r: number; rMax: number; alpha: number; particles: { vx: number; vy: number; px: number; py: number }[] }[] = [];

    const dropCount = Math.min(Math.floor(intensity * 120), 150);

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
          // Create splash with impact particles
          if (Math.random() < 0.7) { 
            const particleCount = 3 + Math.floor(Math.random() * 4);
            const splashParticles = [];
            for (let p = 0; p < particleCount; p++) {
              splashParticles.push({
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 2,
                px: 0,
                py: 0
              });
            }

            splashes.push({
              x: drop.x,
              y: canvas.height - 10 + Math.random() * 10,
              r: 0.5,
              rMax: Math.random() * 20 + 10,
              alpha: 0.8,
              particles: splashParticles
            });
          }
          drop.y = -drop.length;
          drop.x = Math.random() * canvas.width;
        }
      });

      // Draw Splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        
        // Ripple effect
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha * intensity * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Impact particles
        ctx.fillStyle = `rgba(200, 220, 255, ${s.alpha * intensity})`;
        s.particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(s.x + p.px, s.y + p.py, 1, 0, Math.PI * 2);
          ctx.fill();
          
          p.px += p.vx;
          p.py += p.vy;
          p.vy += 0.2; // Gravity
        });
        
        s.r += 0.8;
        s.alpha -= 0.025;
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
    let flakes: { 
      x: number; 
      y: number; 
      r: number; 
      d: number; 
      speed: number; 
      shimmer: number; 
      shimmerSpeed: number;
      swing: number;
      swingSpeed: number;
    }[] = [];

    const flakeCount = Math.floor(intensity * 150);

    const initFlakes = () => {
      flakes = [];
      for (let i = 0; i < flakeCount; i++) {
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2.5 + 0.5, // Variance in size
          d: Math.random() * flakeCount,
          speed: Math.random() * 1.5 + 0.5,
          shimmer: Math.random() * Math.PI,
          shimmerSpeed: Math.random() * 0.03 + 0.01,
          swing: Math.random() * Math.PI * 2,
          swingSpeed: Math.random() * 0.02 + 0.01
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
      
      flakes.forEach((f) => {
        f.shimmer += f.shimmerSpeed;
        f.swing += f.swingSpeed;
        
        const opacity = (0.3 + Math.abs(Math.sin(f.shimmer)) * 0.5) * intensity;
        const drift = Math.sin(f.swing) * 1.5;
        
        ctx.save();
        ctx.translate(f.x + drift, f.y);
        
        // Draw flake with a subtle glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 2);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Solid core
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, f.r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        f.y += f.speed;
        f.x += Math.sin(f.d) * 0.5;

        if (f.y > canvas.height + 10) {
          f.y = -10;
          f.x = Math.random() * canvas.width;
        }
        if (f.x > canvas.width + 10) f.x = -10;
        if (f.x < -10) f.x = canvas.width + 10;
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

// --- Dust Motes Component ---
const DustMotes: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; vx: number; vy: number; alpha: number; shimmer: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          alpha: Math.random() * 0.3 + 0.1,
          shimmer: Math.random() * Math.PI * 2
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.shimmer += 0.02;
        const currentAlpha = p.alpha * (0.5 + Math.sin(p.shimmer) * 0.5);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
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

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay" />;
};

// --- Sun Glare Component ---
const SunGlare: React.FC = () => {
  return (
    <div className="absolute top-[10%] left-[15%] pointer-events-none z-10">
      {/* Central Sun Glow */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.6, 0.8, 0.6]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 w-64 h-64 bg-yellow-200/20 blur-[60px] rounded-full -translate-x-1/2 -translate-y-1/2"
      />
      
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <motion.div
          key={angle}
          initial={{ rotate: angle }}
          animate={{ opacity: [0.1, 0.2, 0.1], scaleY: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, delay: angle * 0.01 }}
          style={{ transformOrigin: 'top center' }}
          className="absolute top-0 left-0 w-1 h-[600px] bg-gradient-to-b from-white/30 to-transparent blur-[4px]"
        />
      ))}

      {/* Main Glare Core */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90]
        }}
        transition={{ 
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="w-[500px] h-[500px] bg-white/10 blur-[100px] rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
      >
        <div className="w-48 h-48 bg-white/30 blur-[50px] rounded-full" />
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

    const allSegments: { path: { x: number; y: number }[]; thickness: number }[] = [];

    const createBolt = (x: number, y: number, angle: number, length: number, thickness: number, depth: number): { x: number; y: number }[] => {
      const branches: { x: number; y: number }[] = [{ x, y }];
      let curX = x;
      let curY = y;
      
      const segments = 15 + Math.random() * 10;
      const step = length / segments;

      for (let i = 0; i < segments; i++) {
        // Jagged path with more variation
        const nextAngle = angle + (Math.random() - 0.5) * 1.2;
        curX += Math.cos(nextAngle) * step;
        curY += Math.sin(nextAngle) * step;
        branches.push({ x: curX, y: curY });

        // More frequent branching
        if (depth < 4 && Math.random() < 0.25) {
          const branchAngle = nextAngle + (Math.random() < 0.5 ? 1.2 : -1.2) * Math.random();
          const branchSegments = createBolt(curX, curY, branchAngle, length * 0.5, thickness * 0.7, depth + 1);
          allSegments.push({ path: branchSegments, thickness: thickness * 0.6 });
        }
      }
      return branches;
    };

    const startX = Math.random() * canvas.width;
    const mainPath = createBolt(startX, 0, Math.PI / 2, canvas.height * (0.8 + Math.random() * 0.4), 4, 0);
    allSegments.push({ path: mainPath, thickness: 4 });

    // Sometimes add a second bolt nearby
    if (Math.random() < 0.3) {
        const secondaryPath = createBolt(startX + (Math.random() - 0.5) * 400, 0, Math.PI / 2, canvas.height * 0.6, 2, 1);
        allSegments.push({ path: secondaryPath, thickness: 2 });
    }

    let alpha = 1;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const flicker = Math.random() > 0.15 ? 1 : 0.2;
      const currentAlpha = alpha * flicker;

      allSegments.forEach(({ path, thickness }) => {
        // Outer glow
        ctx.strokeStyle = `rgba(180, 210, 255, ${currentAlpha * 0.4})`;
        ctx.lineWidth = thickness * 4;
        ctx.shadowBlur = 40 * currentAlpha;
        ctx.shadowColor = 'rgba(120, 160, 255, 1)';
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();

        // White core
        ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.lineWidth = thickness * (Math.random() * 0.5 + 0.5);
        ctx.shadowBlur = 0;
        ctx.stroke();
      });

      alpha -= 0.05; // Slightly slower fade
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

// --- Radar Controls Component ---
interface RadarControlsProps {
  map: L.Map | null;
  lat: number;
  lon: number;
  layer: string;
  setLayer: (l: any) => void;
  opacity: number;
  setOpacity: (o: number) => void;
  isMoving: boolean;
}

const Tooltip: React.FC<{ text: string; visible: boolean; side: 'left' | 'right' }> = ({ text, visible, side }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, x: side === 'right' ? 10 : -10, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: side === 'right' ? 5 : -5, scale: 0.95 }}
        className={cn(
          "absolute px-3 py-1.5 bg-black/90 backdrop-blur-3xl border border-white/20 rounded-lg whitespace-nowrap z-[100] pointer-events-none shadow-2xl",
          side === 'right' ? "left-full ml-4" : "right-full mr-4"
        )}
      >
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-black border border-white/20 rotate-45",
          side === 'right' ? "-left-1 border-r-0 border-t-0" : "-right-1 border-l-0 border-b-0"
        )} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{text}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const RadarControls: React.FC<RadarControlsProps & { active: boolean }> = ({ 
  map, lat, lon, layer, setLayer, opacity, setOpacity, isMoving, active
}) => {
  if (!active) return null;

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [zoom, setZoom] = useState(7);

  useEffect(() => {
    if (!map) return;
    const updateZoom = () => setZoom(map.getZoom());
    map.on('zoom move', updateZoom);
    return () => { map.off('zoom move', updateZoom); };
  }, [map]);

  const layers = [
    { id: 'precipitation_new', label: 'Rain', icon: <CloudRain size={16} />, desc: 'Real-time precipitation (Rain/Snow)' },
    { id: 'temp_new', label: 'Temp', icon: <Thermometer size={16} />, desc: 'Global temperature distribution' },
    { id: 'wind_new', label: 'Wind', icon: <Wind size={16} />, desc: 'Atmospheric wind speed & direction' }
  ];

  return (
    <>
      {/* Radar Controls - LEFT SIDE (Zoom) */}
      <div className="fixed top-80 sm:top-56 left-6 z-[180] flex flex-col gap-3 pointer-events-auto items-center">
        <motion.div 
          animate={{ 
            scale: isMoving ? 0.95 : 1, 
            opacity: isMoving ? 0.6 : 1,
            x: isMoving ? -5 : 0
          }}
          className="bg-black/80 backdrop-blur-3xl border border-white/20 p-2 rounded-2xl flex flex-col gap-3 shadow-2xl transition-all duration-300"
        >
          <button
            onClick={() => map?.zoomIn({ animate: true })}
            onMouseEnter={() => setHoveredItem('zoomin')}
            onMouseLeave={() => setHoveredItem(null)}
            className="w-10 h-10 rounded-xl transition-all flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 relative"
          >
            <div className="text-xl font-bold">+</div>
            <Tooltip text="Zoom In" visible={hoveredItem === 'zoomin'} side="right" />
          </button>

          <div className="relative h-40 w-10 flex flex-col items-center group py-2">
            <div className="absolute inset-y-2 w-1.5 bg-white/5 rounded-full" />
            <motion.div 
              className="absolute w-1.5 bg-sky-500 rounded-full bottom-2 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              animate={{ height: `${Math.max(0, ((zoom - 1) / 17) * (160 - 16))}px` }}
            />
            <input 
              type="range"
              min="1"
              max="18"
              step="0.1"
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                setZoom(newZoom);
                map?.setZoom(newZoom);
              }}
              className="absolute top-1/2 left-1/2 w-32 h-10 -translate-x-1/2 -translate-y-1/2 -rotate-90 opacity-0 cursor-pointer appearance-none z-10"
            />
            
            {/* Zoom Indicator Label */}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 bg-sky-500/20 border border-sky-500/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-sky-400 rotate-90">
              Z{zoom.toFixed(1)}
            </div>

            <motion.div 
              className="absolute w-4 h-4 bg-white rounded-full shadow-2xl pointer-events-none border-2 border-sky-500 z-0"
              animate={{ bottom: `calc(8px + ${((zoom - 1) / 17) * 144}px)` }}
              style={{ transform: 'translateY(50%)' }}
            />
          </div>

          <button
            onClick={() => map?.zoomOut({ animate: true })}
            onMouseEnter={() => setHoveredItem('zoomout')}
            onMouseLeave={() => setHoveredItem(null)}
            className="w-10 h-10 rounded-xl transition-all flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 relative"
          >
            <div className="text-xl font-bold">−</div>
            <Tooltip text="Zoom Out" visible={hoveredItem === 'zoomout'} side="right" />
          </button>
        </motion.div>

        <button
          onClick={() => map?.flyTo([lat, lon], 7, { animate: true, duration: 1.2 })}
          onMouseEnter={() => setHoveredItem('reset')}
          onMouseLeave={() => setHoveredItem(null)}
          className="bg-black/80 backdrop-blur-3xl border border-white/20 w-12 h-12 rounded-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center shadow-2xl group active:scale-90 relative"
        >
          <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
          <Tooltip text="Reset View" visible={hoveredItem === 'reset'} side="right" />
        </button>

        <button
          onClick={() => map?.flyTo([lat, lon], map.getZoom(), { animate: true, duration: 1 })}
          onMouseEnter={() => setHoveredItem('recenter')}
          onMouseLeave={() => setHoveredItem(null)}
          className="bg-black/80 backdrop-blur-3xl border border-white/20 w-12 h-12 rounded-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center shadow-2xl group active:scale-90 relative"
        >
          <LocateFixed size={20} className="transition-transform group-hover:scale-110" />
          <Tooltip text="Recenter" visible={hoveredItem === 'recenter'} side="right" />
        </button>
      </div>

      {/* Radar Controls - RIGHT SIDE (Layers/Opacity) */}
      <div className="fixed top-80 sm:top-56 right-6 z-[180] flex flex-col gap-3 pointer-events-auto items-center">
        <motion.div 
          animate={{ scale: isMoving ? 0.95 : 1, opacity: isMoving ? 0.6 : 1 }}
          className="bg-black/80 backdrop-blur-3xl border border-white/20 p-2 rounded-2xl flex flex-col gap-1 shadow-2xl transition-all duration-300"
        >
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id as any)}
              onMouseEnter={() => setHoveredItem(l.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "p-3 rounded-xl transition-all flex items-center justify-center gap-2 group relative",
                layer === l.id 
                  ? "bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.5)] scale-105" 
                  : "text-white/60 hover:text-white hover:bg-white/10 hover:scale-105"
              )}
            >
              <div className="transition-transform group-hover:scale-110">{l.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-wider hidden lg:block">{l.label}</span>
              {layer === l.id && (
                <motion.div 
                  layoutId="activeLayer"
                  className="absolute -right-1 -top-1 w-3 h-3 bg-white rounded-full border-[3px] border-sky-400 shadow-md z-10"
                  initial={false}
                />
              )}
              <Tooltip text={l.desc} visible={hoveredItem === l.id} side="left" />
            </button>
          ))}
        </motion.div>

        <div className="bg-black/80 backdrop-blur-3xl border border-white/20 p-3 rounded-2xl flex flex-col gap-2 shadow-2xl group relative overflow-hidden">
          {/* Visual Opacity Feedback Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none transition-opacity"
            style={{ backgroundColor: `rgba(14,165,233,${opacity})` }}
          />
          
          <div className="flex justify-between items-center px-1 relative z-10">
            <span className="text-[8px] uppercase tracking-widest font-black text-white/40">Density</span>
            <span className="text-[9px] font-mono font-bold text-sky-400">{Math.round(opacity * 100)}%</span>
          </div>
          <div className="relative h-1.5 w-28 group/slider relative z-10">
            <div 
              className="absolute inset-0 rounded-full bg-white/10 transition-colors group-hover/slider:bg-white/20" 
              style={{
                background: `linear-gradient(to right, rgba(14,165,233,0.1), rgba(14,165,233,${opacity}))`
              }}
            />
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.05" 
              value={opacity} 
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="absolute inset-0 w-full accent-sky-500 cursor-pointer appearance-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </>
  );
};


// --- Radar Map Legend ---
const RadarLegend: React.FC<{ layer: string }> = ({ layer }) => {
  const legendData = {
    precipitation_new: [
      { color: '#7ec9f5', label: 'Light' },
      { color: '#3b82f6', label: 'Mod' },
      { color: '#1d4ed8', label: 'Heavy' },
      { color: '#a855f7', label: 'Severe' }
    ],
    temp_new: [
      { color: '#3b82f6', label: '-20°' },
      { color: '#10b981', label: '0°' },
      { color: '#fbbf24', label: '20°' },
      { color: '#ef4444', label: '40°' }
    ],
    wind_new: [
      { color: '#94a3b8', label: 'Calm' },
      { color: '#22c55e', label: 'Breeze' },
      { color: '#eab308', label: 'Strong' },
      { color: '#f97316', label: 'Gale' }
    ]
  };

  const current = legendData[layer as keyof typeof legendData] || legendData.precipitation_new;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[180] flex items-center gap-4 bg-black/60 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Atmospheric Data</span>
        <span className="text-[10px] font-bold text-white/90 capitalize">{layer.replace('_new', '')} Scale</span>
      </div>
      <div className="h-6 w-px bg-white/10" />
      <div className="flex gap-4">
        {current.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
            <span className="text-[10px] font-bold text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// --- Radar Map Component ---
const RadarMap: React.FC<{ lat: number, lon: number }> = ({ lat, lon }) => {
  const [layer, setLayer] = useState<'precipitation_new' | 'temp_new' | 'wind_new'>('precipitation_new');
  const [opacity, setOpacity] = useState(0.7);
  const [isMoving, setIsMoving] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);

  const MapEvents = () => {
    const mapInstance = useMap();
    useEffect(() => {
      setMap(mapInstance);
      mapInstance.setView([lat, lon], 7);
    }, [mapInstance, lat, lon]);

    useEffect(() => {
      if (!mapInstance) return;
      const onMoveStart = () => setIsMoving(true);
      const onMoveEnd = () => setIsMoving(false);
      
      mapInstance.on('zoomstart dragstart', onMoveStart);
      mapInstance.on('zoomend dragend', onMoveEnd);

      return () => {
        mapInstance.off('zoomstart dragstart', onMoveStart);
        mapInstance.off('zoomend dragend', onMoveEnd);
      };
    }, [mapInstance]);

    return null;
  };

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <motion.div 
        animate={{ 
          filter: isMoving ? 'brightness(1.1) contrast(1.1) blur(1px)' : 'brightness(0.9) contrast(1.1) blur(0px)',
          scale: isMoving ? 1.02 : 1
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full h-full pointer-events-auto"
      >
        <MapContainer 
          center={[lat, lon]} 
          zoom={7} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#0a0f1e' }}
          zoomControl={false}
          zoomAnimation={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <TileLayer
            key={`${layer}-${opacity}`}
            url={`https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=86940733a1e27a922119777174ba1340`}
            opacity={opacity}
            zIndex={100}
          />
          <MapEvents />
        </MapContainer>
      </motion.div>

      <RadarLegend layer={layer} />

      <div className="pointer-events-auto">
        <RadarControls 
          active={true}
          map={map}
        lat={lat}
        lon={lon}
        layer={layer}
        setLayer={setLayer}
        opacity={opacity}
        setOpacity={setOpacity}
        isMoving={isMoving}
      />
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
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-auto">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.2}
        
        hexBinPointsData={hexData}
        hexBinPointWeight="temp"
        hexBinResolution={3}
        hexMargin={0.2}
        hexTopRadius={0.8}
        hexTopColor={d => d.sumWeight > 20 ? '#f87171' : (d.sumWeight > 5 ? '#fbbf24' : '#38bdf8')}
        hexSideColor={d => d.sumWeight > 20 ? 'rgba(248,113,113,0.3)' : 'rgba(56,189,248,0.3)'}
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

      <div className="absolute bottom-10 left-10 z-40 px-6 py-4 rounded-3xl pointer-events-auto">
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
        className="absolute bottom-10 right-10 z-[150] bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-all shadow-2xl flex items-center gap-3 group pointer-events-auto"
      >
        <GlobeIcon size={18} className="group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Reset Camera</span>
      </button>
    </div>
  );
};

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ 
  atmosphere, 
  isDay, 
  latitude = 0, 
  longitude = 0, 
  mode = 'atmosphere',
  intensity = 0.5,
  windSpeed = 5,
  temperature = 20,
  sunIntensity: propSunIntensity,
  onSunIntensityChange
}) => {
  const [localSunIntensity, setLocalSunIntensity] = useState(0.6);
  const sunIntensity = propSunIntensity !== undefined ? propSunIntensity : localSunIntensity;

  const handleSunIntensityChange = (val: number) => {
    setLocalSunIntensity(val);
    onSunIntensityChange?.(val);
  };

  const key = isDay ? atmosphere : `${atmosphere}Night`;
  const gradientClass = atmosphereStyles[key] || atmosphereStyles[isDay ? 'clear' : 'clearNight'];

  // Default intensities based on weather
  const effectiveIntensity = atmosphere === 'thunderstorm' ? 0.8 : (atmosphere === 'rain' ? 0.6 : intensity);

  // Aurora condition: Night, Clear, High Latitude (> 60N or < 60S)
  const showAurora = !isDay && atmosphere === 'clear' && Math.abs(latitude) > 60;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {mode === 'atmosphere' && (
          <motion.div
            key="atmosphere"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none will-change-[opacity]"
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

            {/* Daytime Sun Intensity Overlay */}
            {isDay && atmosphere === 'clear' && (
              <motion.div 
                animate={{ 
                  backgroundColor: `rgba(251, 191, 36, ${sunIntensity * 0.1})`,
                  opacity: sunIntensity 
                }}
                className="absolute inset-0 z-[5] pointer-events-none mix-blend-overlay"
              />
            )}

            {/* Aurora Effect */}
            {showAurora && <AuroraEffect />}

            {/* Night Stars */}
            {!isDay && <StarField />}

            {/* Heat Haze for Hot Conditions */}
            {isDay && temperature > 30 && <HeatHaze intensity={(temperature - 30) / 10} temperature={temperature} />}

            {/* Sunny Day Light Rays & Glare */}
            {isDay && atmosphere === 'clear' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <SunGlare />
                <SunIntensityControl value={sunIntensity} onChange={handleSunIntensityChange} />
                <DustMotes />
                {/* Main Light Ray System */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: [0, 360],
                      opacity: [0.05 * sunIntensity, 0.15 * sunIntensity, 0.05 * sunIntensity],
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
                <motion.div 
                  animate={{ opacity: sunIntensity * 0.5 }}
                  className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full animate-pulse" 
                />
              </div>
            )}

            {/* Wind Driven Clouds (Detailed Layer) */}
            {(atmosphere === 'cloudy' || atmosphere === 'fog' || atmosphere === 'rain') && (
              <WindDrivenClouds windSpeed={windSpeed} condition={atmosphere} />
            )}

            {/* Enhanced Clouds Layer with Parallax */}
            {(atmosphere === 'cloudy' || atmosphere === 'fog' || atmosphere === 'thunderstorm') && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                {[...Array(atmosphere === 'thunderstorm' ? 20 : 12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '-20%', y: (Math.random() * 90) + '%' }}
                    animate={{ x: '120%' }}
                    transition={{
                      duration: (atmosphere === 'thunderstorm' ? 40 : 100) + Math.random() * 200,
                      repeat: Infinity,
                      ease: "linear",
                      delay: -Math.random() * 300
                    }}
                    className={cn(
                      "absolute blur-[160px] rounded-full",
                      i % 3 === 0 ? "w-[1000px] h-[500px]" : (i % 2 === 0 ? "w-[700px] h-[350px]" : "w-[400px] h-[200px]"),
                      atmosphere === 'thunderstorm' ? "bg-slate-900/40" : "bg-white/20"
                    )}
                    style={{
                      opacity: atmosphere === 'thunderstorm' ? 0.1 + Math.random() * 0.2 : 0.03 + Math.random() * 0.1,
                      scale: 0.8 + Math.random() * 0.5,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Volumetric Fog Layer */}
            {atmosphere === 'fog' && <VolumetricFog intensity={effectiveIntensity} />}

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
