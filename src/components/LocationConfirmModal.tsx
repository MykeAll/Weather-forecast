import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Check, Navigation, Users, Mountain, Clock } from 'lucide-react';
import { SearchSuggestion } from '../types';
import { cn } from '../lib/utils';

interface LocationConfirmModalProps {
  location: SearchSuggestion | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const getCityType = (pop?: number) => {
  if (!pop) return 'Location';
  if (pop > 5000000) return 'Megacity';
  if (pop > 1000000) return 'Metropolis';
  if (pop > 100000) return 'Large City';
  if (pop > 10000) return 'Town';
  return 'Village';
};

const formatPopulation = (num?: number) => {
  if (!num) return 'N/A';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const LocationConfirmModal: React.FC<LocationConfirmModalProps> = ({ 
  location, 
  onConfirm, 
  onCancel 
}) => {
  if (!location) return null;

  const cityType = getCityType(location.population);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-[#1a1a1a] border border-white/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header Graphic */}
          <div className="h-32 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl z-10"
            >
              <MapPin size={32} className="text-white" />
            </motion.div>
          </div>

          <div className="p-8 md:p-10">
            <div className="text-center space-y-2 mb-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                  {cityType}
                </span>
                <span className="text-white/20">•</span>
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30">City Overview</h3>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">{location.name}</h2>
              <p className="text-white/60 font-medium">
                {location.admin1 ? `${location.admin1}, ` : ''}{location.country}
              </p>
            </div>

            {/* City Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white/30 mb-1">
                  <Users size={14} />
                  <span className="text-[9px] uppercase font-black tracking-wider">Population</span>
                </div>
                <span className="text-lg font-bold text-white">{formatPopulation(location.population)}</span>
              </div>
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white/30 mb-1">
                  <Mountain size={14} />
                  <span className="text-[9px] uppercase font-black tracking-wider">Elevation</span>
                </div>
                <span className="text-lg font-bold text-white">{location.elevation ? `${Math.round(location.elevation)}m` : 'N/A'}</span>
              </div>
              <div className="col-span-2 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/30 text-[10px] font-black uppercase tracking-wider">
                  <Clock size={14} />
                  <span>Timezone</span>
                </div>
                <span className="text-xs font-bold text-white/70">{location.timezone || 'Unknown'}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onCancel}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Cancel"
              >
                <X size={20} />
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 p-4 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                View Weather <Navigation size={18} className="fill-black" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between px-8">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Coordinates Validated</span>
            </div>
            <span className="text-[8px] font-mono text-white/10">{location.lat.toFixed(2)}°N, {location.lon.toFixed(2)}°E</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
