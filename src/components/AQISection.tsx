import React, { useState } from 'react';
import { AQIData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Activity, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AQISectionProps {
  data: AQIData | null;
}

const pollutantDetails = {
  'PM2.5': {
    name: 'Fine Particulate Matter',
    health: 'Can penetrate deep into the lungs and enter the bloodstream, affecting both lung and heart health.',
    sources: 'Vehicle exhausts, industrial processes, and wood burning.'
  },
  'PM10': {
    name: 'Coarse Particulate Matter',
    health: 'Can cause respiratory irritation and aggravate asthma or allergies.',
    sources: 'Dust from roads, construction, mold, and pollen.'
  },
  'NO₂': {
    name: 'Nitrogen Dioxide',
    health: 'Increases inflammation of the airways and susceptibility to respiratory infections.',
    sources: 'Predominantly fossil fuel combustion from road transport and power plants.'
  },
  'O₃': {
    name: 'Ozone',
    health: 'Reduces lung function and can trigger chest pain, coughing, and throat irritation.',
    sources: 'Chemical reactions between sunlight and emissions from vehicles and industry.'
  },
  'SO₂': {
    name: 'Sulfur Dioxide',
    health: 'A pungent gas that can cause breathing difficulties, especially for people with asthma.',
    sources: 'Power plants and industrial facilities that burn sulfur-containing fuels.'
  },
  'CO': {
    name: 'Carbon Monoxide',
    health: 'Reduces the amount of oxygen that can be transported in the blood stream.',
    sources: 'Incomplete combustion of fuels from vehicles, older furnaces, and fireplaces.'
  }
};

export const AQISection: React.FC<AQISectionProps> = ({ data }) => {
  const [selectedPollutant, setSelectedPollutant] = useState<string | null>(null);

  if (!data) return null;

  const pollutants = [
    { label: 'PM2.5', value: data.pollutants.pm2_5, unit: 'µg/m³', desc: 'Fine particles', max: 50, alertThreshold: 35 },
    { label: 'PM10', value: data.pollutants.pm10, unit: 'µg/m³', desc: 'Coarse particles', max: 100, alertThreshold: 75 },
    { label: 'NO₂', value: data.pollutants.no2, unit: 'µg/m³', desc: 'Nitrogen dioxide', max: 100, alertThreshold: 80 },
    { label: 'O₃', value: data.pollutants.o3, unit: 'µg/m³', desc: 'Ozone', max: 150, alertThreshold: 120 },
    { label: 'SO₂', value: data.pollutants.so2, unit: 'µg/m³', desc: 'Sulfur dioxide', max: 100, alertThreshold: 70 },
    { label: 'CO', value: data.pollutants.co, unit: 'µg/m³', desc: 'Carbon monoxide', max: 1000, alertThreshold: 900 },
  ] as const;

  const alerts = pollutants.filter(p => p.value > p.alertThreshold);

  const getPollutantColor = (value: number, max: number) => {
    const ratio = value / max;
    if (ratio < 0.3) return 'bg-emerald-400';
    if (ratio < 0.6) return 'bg-yellow-400';
    if (ratio < 0.9) return 'bg-orange-400';
    return 'bg-rose-500';
  };

  const getProgress = (index: number) => Math.min(100, (index / 100) * 100);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 sm:p-8 overflow-hidden pointer-events-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 sm:mb-12">
        <div className="space-y-1">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40">Air Quality Index</h3>
          <div className="flex items-center gap-3">
            <span className={cn("text-3xl font-black tracking-tighter", data.color)}>
              {data.index}
            </span>
            <div className="flex flex-col">
              <span className={cn("text-sm font-bold uppercase tracking-widest", data.color)}>
                {data.label}
              </span>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Atmospheric Health</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
            <Activity size={16} className="text-sky-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/80 uppercase">Sensor Data</span>
              <span className="text-[9px] text-white/30 uppercase tracking-tighter">Real-time update</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-1 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${getProgress(data.index)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={cn("absolute h-full rounded-full", data.color.replace('text-', 'bg-'))}
        />
      </div>

      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Active Pollutant Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map(a => (
                <div key={a.label} className="bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 flex flex-col gap-1 p-3 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-200">{a.label} High</span>
                    <span className="text-[10px] font-mono text-rose-400/60">{Math.round(a.value)} {a.unit}</span>
                  </div>
                  <p className="text-[9px] text-rose-300/40 leading-tight">
                    {pollutantDetails[a.label as keyof typeof pollutantDetails]?.health.split('.')[0]}.
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-rose-200/50 leading-relaxed font-medium mt-1 px-1">
              Concentrations exceeding safety limits. Immediate health effects may include respiratory irritation and increased risk for sensitive individuals.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {pollutants.map((p, i) => (
          <motion.button
            key={p.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedPollutant(p.label === selectedPollutant ? null : p.label)}
            className={cn(
              "p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all text-left group relative cursor-pointer",
              selectedPollutant === p.label ? "bg-white/10 border-white/20 ring-1 ring-white/10 scale-[1.02]" : "hover:bg-white/[0.08]"
            )}
          >
            <div className="flex flex-col gap-1 relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{p.label}</span>
                <Info size={10} className={cn("transition-opacity", selectedPollutant === p.label ? "opacity-100 text-sky-400" : "opacity-0 group-hover:opacity-40")} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white/80">{Math.round(p.value)}</span>
                <span className="text-[8px] text-white/20 font-bold uppercase">{p.unit}</span>
              </div>
              
              {/* Individual Pollutant Progress Bar */}
              <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (p.value / p.max) * 100)}%` }}
                  transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                  className={cn("h-full rounded-full opacity-60", getPollutantColor(p.value, p.max))}
                />
              </div>

              <p className="text-[8px] text-white/20 uppercase tracking-tighter mt-2">{p.desc}</p>
            </div>

            {selectedPollutant === p.label && (
              <motion.div
                layoutId="pollutant-glow"
                className="absolute inset-0 bg-sky-500/5 blur-xl rounded-2xl -z-10"
              />
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selectedPollutant && (
          <motion.div
            key={selectedPollutant}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="mt-8 overflow-hidden"
          >
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 relative">
              <button 
                onClick={() => setSelectedPollutant(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/20 hover:text-white/60 cursor-pointer"
              >
                <X size={14} />
              </button>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    {pollutantDetails[selectedPollutant as keyof typeof pollutantDetails].name}
                  </h4>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Health Implications</span>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {pollutantDetails[selectedPollutant as keyof typeof pollutantDetails].health}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Common Sources</span>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {pollutantDetails[selectedPollutant as keyof typeof pollutantDetails].sources}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 p-6 rounded-3xl bg-sky-500/5 border border-sky-500/10 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center shrink-0">
          <Wind size={20} className="text-sky-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Environment Note</h4>
          <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
            {data.index < 40 
              ? "The air is clear and safe for all outdoor activities. Enjoy the fresh atmosphere."
              : data.index < 70 
                ? "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution."
                : "Health alert: everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects."}
          </p>
        </div>
      </div>
    </div>
  );
};
