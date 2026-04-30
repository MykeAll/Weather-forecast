import React, { useState } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { HourlyForecast, DailyForecast, UnitSettings } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { convertTemperature } from '../lib/conversions';
import { ChevronRight, CloudRain } from 'lucide-react';

interface ForecastSectionProps {
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  units: UnitSettings;
  timezone?: string;
  isAtmosphereMode?: boolean;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({ hourly, daily, units, timezone, isAtmosphereMode = true }) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');

  // Show the next 24 hours from current local time in that timezone
  const now = new Date();
  const localTimeStr = timezone 
    ? now.toLocaleString('en-US', { timeZone: timezone }) 
    : now.toISOString();
  const localNow = new Date(localTimeStr);

  const currentHourly = hourly
    .filter(h => new Date(h.time) >= localNow)
    .slice(0, 24);

  const getHourlyForDay = (dateStr: string) => {
    const targetDate = parseISO(dateStr);
    return hourly.filter(h => isSameDay(parseISO(h.time), targetDate));
  };

  const tabs = [
    { id: 'hourly', label: 'Next 24h' },
    { id: 'daily', label: '7-Day Forecast' }
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* View Toggle Filters */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className={cn(
          "flex p-1 rounded-2xl border transition-all duration-700",
          isAtmosphereMode ? "bg-white/5 border-white/10" : "bg-black/20 border-white/10"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden group",
                view === tab.id ? "text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {view === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className={cn(
                    "absolute inset-0 z-0 border",
                    isAtmosphereMode ? "bg-white/10 border-white/20" : "bg-sky-500/20 border-sky-500/30"
                  )}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'hourly' ? (
          <motion.div
            key="hourly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "w-full border rounded-[32px] p-6 sm:p-8 overflow-hidden",
              isAtmosphereMode ? "bg-white/5 backdrop-blur-md border-white/10" : "bg-white/10 border-white/20"
            )}
          >
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40 mb-8 px-2">High Resolution Timeline</h3>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
              {currentHourly.map((item, i) => (
                <motion.div
                  key={item.time}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -12, 
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 20px 40px -12px rgba(0,0,0,0.5)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    delay: i * 0.02
                  }}
                  className="flex flex-col items-center gap-3 min-w-[80px] p-4 rounded-[24px] border border-transparent hover:border-white/10 transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] uppercase tracking-widest font-black text-white/30 group-hover:text-white/60 transition-colors">
                    {format(parseISO(item.time), 'HH:mm')}
                  </span>
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300 relative">
                    <WeatherIcon code={item.conditionCode} isDay={item.isDay} size={28} />
                    {item.precipitation > 0 && (
                      <div className="absolute -top-1 -right-1 bg-sky-500 rounded-full p-1 border border-[#020617]">
                        <CloudRain size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center transition-transform group-hover:scale-105">
                    <span className="text-xl font-bold tracking-tighter text-white">
                      {convertTemperature(item.temp, units.temperature)}°
                    </span>
                    <span className="text-[9px] font-medium text-white/40 uppercase tracking-tighter">
                      Feels {convertTemperature(item.feelsLike, units.temperature)}°
                    </span>
                    {item.precipitation > 0 && (
                      <span className="text-[8px] font-black text-sky-400 tabular-nums mt-1">
                        {item.precipitation.toFixed(1)}mm
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "w-full border rounded-[32px] p-6 sm:p-8",
              isAtmosphereMode ? "bg-white/5 backdrop-blur-md border-white/10" : "bg-white/10 border-white/20"
            )}
          >
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40 mb-8 px-2">Atmospheric Patterns</h3>
            <div className="space-y-4">
              {daily.map((item, i) => {
                const date = parseISO(item.date);
                const isToday = isSameDay(date, new Date());
                const isExpanded = expandedDay === item.date;
                const dayHourly = getHourlyForDay(item.date);

                return (
                  <div key={item.date} className="space-y-4">
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setExpandedDay(isExpanded ? null : item.date)}
                      className={cn(
                        "flex items-center justify-between w-full group p-3 rounded-2xl transition-all cursor-pointer",
                        isExpanded ? "bg-white/10" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight 
                          size={14} 
                          className={cn("text-white/30 transition-transform duration-300", isExpanded && "rotate-90")} 
                        />
                        <div className="w-16 text-left">
                          <span className={isToday ? "text-white font-bold" : "text-white/60 font-medium"}>
                            {isToday ? 'Today' : format(date, 'EEEE')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {item.precipitationSum > 0 && (
                          <div className="flex items-center gap-1 opacity-60">
                            <CloudRain size={10} className="text-sky-400" />
                            <span className="text-[10px] font-bold text-sky-400">{item.precipitationSum.toFixed(1)}mm</span>
                          </div>
                        )}
                        <WeatherIcon code={item.conditionCode} size={24} />
                        <div className="flex flex-col items-end min-w-[100px]">
                          <div className="flex gap-4 justify-end items-center">
                            <span className="text-white font-bold">
                              {convertTemperature(item.maxTemp, units.temperature)}°
                            </span>
                            <span className="text-white/30 font-medium text-sm">
                              {convertTemperature(item.minTemp, units.temperature)}°
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="overflow-hidden bg-white/5 rounded-2xl p-5 border border-white/5"
                        >
                          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-3">
                            {dayHourly.map((h) => (
                              <div key={h.time} className="flex flex-col items-center gap-3 min-w-[64px] p-2 rounded-xl hover:bg-white/5 transition-colors group/item">
                                <span className="text-[9px] font-bold text-white/30 group-hover/item:text-white/50 transition-colors uppercase tracking-tighter">
                                  {format(parseISO(h.time), 'ha')}
                                </span>
                                <div className="relative">
                                  <WeatherIcon code={h.conditionCode} isDay={h.isDay} size={22} />
                                  {h.precipitation > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-sky-500 w-2 h-2 rounded-full border border-[#020617]" />
                                  )}
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-black text-white">
                                    {convertTemperature(h.temp, units.temperature)}°
                                  </span>
                                  <span className="text-[8px] font-medium text-white/30 tabular-nums">
                                    {convertTemperature(h.feelsLike, units.temperature)}°
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
