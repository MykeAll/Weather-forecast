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
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({ hourly, daily, units, timezone }) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hourly Forecast (Default/Today) */}
      <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 sm:p-8 overflow-hidden">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40 mb-8">Next 24 Hours</h3>
        <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
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
              className="flex flex-col items-center gap-4 min-w-[76px] p-5 rounded-[24px] border border-transparent hover:border-white/10 transition-colors cursor-pointer group"
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
              <div className="flex flex-col items-center gap-1 transition-transform group-hover:scale-110">
                <span className="text-xl font-bold tracking-tighter text-white">
                  {convertTemperature(item.temp, units.temperature)}°
                </span>
                {item.precipitation > 0 && (
                  <span className="text-[8px] font-black text-sky-400 tabular-nums">
                    {item.precipitation.toFixed(1)}mm
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Daily Forecast */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 sm:p-8">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40 mb-8">7-Day Forecast</h3>
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
                  transition={{ delay: 0.3 + i * 0.05 }}
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
                    <div className="w-12 text-left">
                      <span className={isToday ? "text-white font-bold" : "text-white/60 font-medium"}>
                        {isToday ? 'Today' : format(date, 'eee')}
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
                    <div className="flex gap-4 min-w-[80px] justify-end items-center">
                      <span className="text-white font-bold">
                        {convertTemperature(item.maxTemp, units.temperature)}°
                      </span>
                      <span className="text-white/30 font-medium text-sm">
                        {convertTemperature(item.minTemp, units.temperature)}°
                      </span>
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
                      className="overflow-hidden bg-white/5 rounded-2xl p-4"
                    >
                      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
                        {dayHourly.map((h) => (
                          <div key={h.time} className="flex flex-col items-center gap-2 min-w-[50px]">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                              {format(parseISO(h.time), 'ha')}
                            </span>
                            <WeatherIcon code={h.conditionCode} isDay={h.isDay} size={18} />
                            <span className="text-xs font-black text-white/80">
                              {convertTemperature(h.temp, units.temperature)}°
                            </span>
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
      </div>
    </div>
  );
};
