import React from 'react';
import { PollenData } from '../types';
import { Leaf, Wind, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface PollenSectionProps {
  data: PollenData | null;
}

const getPollenLevel = (value: number) => {
  if (value === 0) return { label: 'Extremely Low', color: 'text-white/40', bg: 'bg-white/5', advice: 'No significant allergens detected. Enjoy the fresh air!' };
  if (value < 15) return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10', advice: 'Low risk. Most people can enjoy outdoor activities without issues.' };
  if (value < 50) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10', advice: 'Consider closing windows if you are sensitive. Typical allergy symptoms may occur.' };
  if (value < 150) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10', advice: 'High risk. Limit time outdoors during peak hours (10 AM - 4 PM).' };
  return { label: 'Extreme', color: 'text-rose-400', bg: 'bg-rose-500/10', advice: 'Avoid unnecessary outdoor time. Keep windows closed and use an air purifier.' };
};

const allergenDetails: Record<keyof PollenData, { name: string; description: string }> = {
  alder: { 
    name: 'Alder Trees',
    description: 'One of the first trees to bloom in spring. Cross-reactivity with birch is common.'
  },
  birch: { 
    name: 'Birch Trees',
    description: 'Highly potent spring allergen. Peak pollen counts usually occur in late afternoon.'
  },
  grass: { 
    name: 'Grasses',
    description: 'The most common cause of hay fever globally, peaking in late spring and summer.'
  },
  mugwort: { 
    name: 'Mugwort',
    description: 'Weed allergen that blooms in late summer. Often found in dry, disturbed soil.'
  },
  olive: { 
    name: 'Olive Trees',
    description: 'Common in Mediterranean climates. Produces large amounts of buoyant pollen.'
  },
  ragweed: { 
    name: 'Ragweed',
    description: 'Wait for late summer/fall. A single plant can produce up to a billion grains per year.'
  },
};

export const PollenSection: React.FC<PollenSectionProps> = ({ data }) => {
  if (!data) return null;

  const pollenValues = Object.values(data) as number[];
  const maxPollen = Math.max(...pollenValues);
  const overallRisk = getPollenLevel(maxPollen);

  const activeAllergens = (Object.entries(data) as [keyof PollenData, number][])
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 md:p-10">
      {/* Header & Overall Risk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl shadow-inner">
              <Leaf size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mb-1">Air Quality</h3>
              <h2 className="text-2xl font-bold text-white">Allergen Insights</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-white/60 max-w-md leading-relaxed text-sm">
              {overallRisk.advice}
            </p>
            
            {activeAllergens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeAllergens.slice(0, 3).map(([key, _]) => (
                  <span key={key} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-white/60 uppercase tracking-wider">
                    {allergenDetails[key].name} Active
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "px-8 py-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center min-w-[200px] transition-all duration-1000",
          overallRisk.bg
        )}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-2">Overall Risk</span>
          <span className={cn("text-3xl font-black tracking-tight", overallRisk.color)}>
            {overallRisk.label}
          </span>
        </div>
      </div>

      {/* Individual Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Object.entries(data) as [keyof PollenData, number][]).map(([key, value], i) => {
          const level = getPollenLevel(value);
          const percentage = Math.min(100, (value / 250) * 100);
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all duration-500 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-base font-bold text-white/80 block">{allergenDetails[key].name}</span>
                  <p className="text-[10px] text-white/40 leading-relaxed max-w-[180px]">
                    {allergenDetails[key].description}
                  </p>
                </div>
                <span className={cn("text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md bg-black/20 shrink-0", level.color)}>
                  {Math.round(value)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/30 font-bold">
                  <span>Level</span>
                  <span className={level.color}>{level.label}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    className={cn("h-full rounded-full transition-colors", level.color.replace('text', 'bg'))}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
        <Info size={12} />
        <span>Grains per cubic meter (m³)</span>
      </div>
    </div>
  );
};
