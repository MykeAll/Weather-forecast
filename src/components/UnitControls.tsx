import React from 'react';
import { TemperatureUnit, WindSpeedUnit, UnitSettings } from '../types';
import { WeatherBackgroundMode } from './WeatherBackground';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Settings2, Globe, Cloud, Map as MapIcon } from 'lucide-react';

interface UnitControlsProps {
  settings: UnitSettings;
  onUpdate: (settings: UnitSettings) => void;
  backgroundMode: WeatherBackgroundMode;
  onBackgroundModeChange: (mode: WeatherBackgroundMode) => void;
  isAtmosphereMode?: boolean;
}

export const UnitControls: React.FC<UnitControlsProps> = ({ 
  settings, 
  onUpdate,
  backgroundMode,
  onBackgroundModeChange,
  isAtmosphereMode = true
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: '#edebeb', borderWidth: '1.8px' }}
        className={cn(
          "p-3 rounded-2xl transition-all text-white duration-700 cursor-pointer shadow-md",
          isAtmosphereMode 
            ? "bg-black/60 backdrop-blur-xl border border-white/20 hover:bg-black/70 shadow-lg shadow-black/20" 
            : backgroundMode === 'radar'
              ? "bg-black/60 backdrop-blur-md border border-white/20 shadow-black/40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              : "bg-transparent border-transparent hover:bg-white/5 shadow-none",
          isOpen && "bg-black/80 border-white/40"
        )}
      >
        <Settings2 size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-full right-0 mt-4 p-6 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl min-w-[280px] z-[100]"
          >
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3 block">Perspective</span>
                <div className="grid grid-cols-3 bg-white/5 p-1 rounded-xl gap-1">
                  {[
                    { id: 'atmosphere', icon: <Cloud size={14} />, label: 'Sky' },
                    { id: 'globe', icon: <Globe size={14} />, label: 'Globe' },
                    { id: 'radar', icon: <MapIcon size={14} />, label: 'Radar' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onBackgroundModeChange(mode.id as WeatherBackgroundMode)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                        backgroundMode === mode.id 
                          ? "bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {mode.icon}
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Temperature</span>
                  <span className="text-[9px] font-black text-sky-400/80 uppercase tracking-tighter">
                    Switch to {settings.temperature === 'celsius' ? 'Fahrenheit' : 'Celsius'}
                  </span>
                </div>
                <div className="flex bg-white/5 p-1 rounded-2xl relative">
                  {(['celsius', 'fahrenheit'] as TemperatureUnit[]).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => onUpdate({ ...settings, temperature: unit })}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest relative z-10 cursor-pointer",
                        settings.temperature === unit 
                          ? "text-slate-900" 
                          : "text-white/40 hover:text-white"
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                  <motion.div
                    layoutId="temp-active"
                    className="absolute inset-y-1 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    initial={false}
                    animate={{
                      x: settings.temperature === 'celsius' ? 0 : '100%',
                      width: '50%'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3 block">Wind Speed</span>
                <div className="flex bg-white/5 p-1 rounded-xl">
                  {(['kmh', 'mph'] as WindSpeedUnit[]).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => onUpdate({ ...settings, windSpeed: unit })}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer",
                        settings.windSpeed === unit 
                          ? "bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.4)] ring-2 ring-white/50" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {unit === 'kmh' ? 'km/h' : 'mph'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3 block">Refresh Rate</span>
                <div className="grid grid-cols-4 bg-white/5 p-1 rounded-xl gap-1">
                  {[15, 30, 60, 120].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onUpdate({ ...settings, refreshRate: rate })}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                        settings.refreshRate === rate 
                          ? "bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {rate >= 60 ? `${rate / 60}h` : `${rate}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
