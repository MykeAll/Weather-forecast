import React, { useState, useEffect } from 'react';
import { Wind, Droplets, Sun, Eye, Thermometer, Navigation, Sunrise, Sunset, AlertTriangle, Info, X, Gauge, Cloud, CloudRain, Moon, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UnitSettings } from '../types';
import { convertWindSpeed, convertTemperature } from '../lib/conversions';
import { format, parseISO, differenceInMinutes, addDays, isAfter, isBefore } from 'date-fns';

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  accessory?: React.ReactNode;
  delay?: number;
  isHighRisk?: boolean;
  onClick?: () => void;
  className?: string;
  isAtmosphereMode?: boolean;
}

const CelestialPhase: React.FC<{ sunrise: string; sunset: string; delay?: number; isAtmosphereMode?: boolean }> = ({ sunrise, sunset, delay = 0, isAtmosphereMode = true }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDay, setIsDay] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updatePhase = () => {
      const now = new Date();
      const rise = parseISO(sunrise);
      const set = parseISO(sunset);
      
      let currentIsDay = false;
      let currentProgress = 0;
      let nextEvent = '';

      if (isAfter(now, rise) && isBefore(now, set)) {
        // Day phase
        currentIsDay = true;
        const totalDayMinutes = differenceInMinutes(set, rise);
        const elapsedMinutes = differenceInMinutes(now, rise);
        currentProgress = Math.min(Math.max(elapsedMinutes / totalDayMinutes, 0), 1);
        
        const remaining = differenceInMinutes(set, now);
        nextEvent = `${Math.floor(remaining / 60)}h ${remaining % 60}m until Sunset`;
      } else {
        // Night phase
        currentIsDay = false;
        const tomorrowRise = addDays(rise, isAfter(now, set) ? 1 : 0);
        const prevSet = isAfter(now, set) ? set : addDays(set, -1);
        
        const totalNightMinutes = differenceInMinutes(tomorrowRise, prevSet);
        const elapsedMinutes = differenceInMinutes(now, prevSet);
        currentProgress = Math.min(Math.max(elapsedMinutes / totalNightMinutes, 0), 1);

        const remaining = differenceInMinutes(tomorrowRise, now);
        nextEvent = `${Math.floor(remaining / 60)}h ${remaining % 60}m until Sunrise`;
      }

      setIsDay(currentIsDay);
      setProgress(currentProgress);
      setTimeLeft(nextEvent);
    };

    updatePhase();
    const interval = setInterval(updatePhase, 60000);
    return () => clearInterval(interval);
  }, [sunrise, sunset]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.8 }}
      onClick={() => setShowDetails(!showDetails)}
      className={cn(
        "col-span-2 p-5 rounded-3xl flex flex-col items-center justify-center transition-all group relative overflow-hidden text-center cursor-pointer",
        isAtmosphereMode ? "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10" : "bg-white/10 border border-white/20 hover:bg-white/20"
      )}
    >
      <div className="absolute top-4 right-4">
        <Info size={12} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>

      <div className="relative w-full h-24 mb-4 flex items-end justify-center">
        {/* The Arc Path */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 50">
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
            strokeDasharray="1 3"
            className="opacity-20"
          />
          
          {/* Animated Position Indicator */}
          <motion.circle
            cx={10 + (progress * 80)}
            cy={45 - (Math.sin(progress * Math.PI) * 35)}
            r="2"
            className={isDay ? "fill-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "fill-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.5)]"}
            initial={false}
            animate={{ 
              cx: 10 + (progress * 80),
              cy: 45 - (Math.sin(progress * Math.PI) * 35)
            }}
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          {isDay ? (
            <Sun size={28} className="text-yellow-400 mb-1" />
          ) : (
            <Moon size={28} className="text-indigo-300 mb-1" />
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {isDay ? 'Solar Phase' : 'Lunar Phase'}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showDetails ? (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-1"
          >
            <p className="text-xl font-light text-white">
              {Math.round(progress * 100)}% <span className="text-xs text-white/40 uppercase font-black tracking-widest ml-1">Elapsed</span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2"
          >
            <Clock size={12} className="text-sky-400" />
            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest whitespace-nowrap">
              {timeLeft}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const WindCompass: React.FC<{ direction: number }> = ({ direction }) => (
  <div className="relative flex items-center justify-center shrink-0 w-8 h-8 sm:w-10 sm:h-10">
    {/* Compass Ring */}
    <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5" />
    
    {/* Cardinal Marks */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="absolute top-0 text-[5px] sm:text-[7px] font-black text-white/30 leading-none -translate-y-0.5">N</span>
      <span className="absolute right-0 text-[5px] sm:text-[7px] font-black text-white/30 leading-none translate-x-0.5">E</span>
      <span className="absolute bottom-0 text-[5px] sm:text-[7px] font-black text-white/30 leading-none translate-y-0.5">S</span>
      <span className="absolute left-0 text-[5px] sm:text-[7px] font-black text-white/30 leading-none -translate-x-0.5">W</span>
    </div>

    {/* Needle Wrapper */}
    <motion.div
      animate={{ rotate: direction }}
      transition={{ type: "spring", stiffness: 40, damping: 12 }}
      className="relative z-10 flex items-center justify-center"
    >
      <div className="w-1 h-3 sm:w-1.5 sm:h-4 bg-sky-400 rounded-full relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 border-t-2 border-l-2 border-sky-400 rotate-45 -translate-y-0.5" />
      </div>
    </motion.div>
  </div>
);

const Metric: React.FC<MetricProps> = ({ label, value, unit, icon, accessory, isHighRisk, onClick, delay = 0, isAtmosphereMode = true }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: "easeOut" }}
    onClick={onClick}
    className={cn(
      "p-5 rounded-3xl flex flex-col justify-between transition-all group h-full relative overflow-hidden text-left",
      isAtmosphereMode ? "bg-white/5 backdrop-blur-md border border-white/10" : "bg-white/10 border border-white/20",
      onClick ? "hover:bg-white/10 cursor-pointer" : "pointer-events-none",
      isHighRisk && "border-orange-500/30 bg-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 bg-white/5 rounded-xl transition-colors shrink-0",
          isHighRisk ? "bg-orange-500/10 text-orange-400" : "group-hover:bg-white/10"
        )}>
          {icon}
        </div>
        {accessory && (
          <div className="shrink-0 flex items-center justify-center">
            {accessory}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-white/40 text-right">{label}</span>
        {onClick && <Info size={10} className="opacity-0 group-hover:opacity-40 transition-opacity text-white" />}
      </div>
    </div>
    <div className="flex items-baseline gap-1 flex-wrap relative z-10">
      <span className={cn(
        "text-2xl sm:text-3xl font-light leading-tight transition-colors",
        isHighRisk ? "text-orange-400" : "text-white"
      )}>
        {value}
      </span>
      {unit && <span className="text-xs sm:text-sm text-white/50 font-medium">{unit}</span>}
    </div>

    {isHighRisk && (
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-orange-500/10 pointer-events-none"
      />
    )}
  </motion.button>
);

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeatherMetricsProps {
  windSpeed: number;
  windDir: number;
  humidity: number;
  uvIndex: number;
  visibility: number;
  pressure: number;
  cloudCover: number;
  precipitation: number;
  feelsLike: number;
  sunrise: string;
  sunset: string;
  units: UnitSettings;
  isAtmosphereMode?: boolean;
  hourly?: any[]; // For UV trend
}

const UVTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  const chartData = data.slice(0, 24).map(h => ({
    time: format(parseISO(h.time), 'HH:mm'),
    uv: h.uvIndex
  }));

  return (
    <div className="h-40 w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            interval={3}
          />
          <YAxis hide domain={[0, 'dataMax + 2']} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-1">{payload[0].payload.time}</p>
                    <p className="text-sm font-bold text-yellow-400">UV Index: {payload[0].value}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="uv" 
            stroke="#fbbf24" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#uvGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeatherMetrics: React.FC<WeatherMetricsProps> = ({
  windSpeed,
  windDir,
  humidity,
  uvIndex,
  visibility,
  pressure,
  cloudCover,
  precipitation,
  feelsLike,
  sunrise,
  sunset,
  units,
  isAtmosphereMode = true,
  hourly = []
}) => {
  const [showUVInfo, setShowUVInfo] = useState(false);
  
  const displayWind = convertWindSpeed(windSpeed, units.windSpeed);
  const displayFeelsLike = convertTemperature(feelsLike, units.temperature);
  const windUnit = units.windSpeed === 'kmh' ? 'km/h' : 'mph';
  const tempUnit = units.temperature === 'celsius' ? 'C' : 'F';

  const formatTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), 'HH:mm');
    } catch (e) {
      return '--:--';
    }
  };

  const getUVStatus = (uv: number) => {
    if (uv <= 2) return { 
      label: 'Low', 
      color: 'text-emerald-400', 
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/5',
      risk: false,
      advice: 'No protection required. You can safely stay outside.'
    };
    if (uv <= 5) return { 
      label: 'Moderate', 
      color: 'text-yellow-400', 
      borderColor: 'border-yellow-500/30',
      bgColor: 'bg-yellow-500/5',
      risk: false,
      advice: 'Protection recommended. Wear sunglasses and SPF 30+.'
    };
    if (uv <= 7) return { 
      label: 'High', 
      color: 'text-orange-400', 
      borderColor: 'border-orange-500/30',
      bgColor: 'bg-orange-500/5',
      risk: true,
      advice: 'Protection required. Seek shade during midday hours.'
    };
    if (uv <= 10) return { 
      label: 'Very High', 
      color: 'text-rose-400', 
      borderColor: 'border-rose-500/30',
      bgColor: 'bg-rose-500/5',
      risk: true,
      advice: 'Extra protection essential. Avoid sun between 11am-4pm.'
    };
    return { 
      label: 'Extreme', 
      color: 'text-purple-400', 
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/5',
      risk: true,
      advice: 'Full protection mandatory. Stay indoors if possible.'
    };
  };

  const uvStatus = getUVStatus(uvIndex);

  const uvScale = [
    { range: '0-2', label: 'Low', color: 'bg-emerald-400', advice: 'Safe exposure' },
    { range: '3-5', label: 'Mod', color: 'bg-yellow-400', advice: 'Use Sunscreen' },
    { range: '6-7', label: 'High', color: 'bg-orange-400', advice: 'Seek Shade' },
    { range: '8-10', label: 'V. High', color: 'bg-rose-500', advice: 'Avoid Midday' },
    { range: '11+', label: 'Extr', color: 'bg-purple-600', advice: 'Stay Indoors' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <CelestialPhase sunrise={sunrise} sunset={sunset} delay={0.05} isAtmosphereMode={isAtmosphereMode} />
        
        <Metric 
          label="Wind" 
          value={displayWind} 
          unit={windUnit}
          icon={<Wind size={18} className="text-blue-300" />} 
          accessory={<WindCompass direction={windDir} />}
          delay={0.1}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Humidity" 
          value={humidity} 
          unit="%" 
          icon={<Droplets size={18} className="text-sky-300" />} 
          delay={0.15}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="UV Index" 
          value={uvIndex} 
          icon={uvIndex >= 8 ? <AlertTriangle size={18} className="animate-pulse" /> : <Sun size={18} className="text-yellow-300" />} 
          isHighRisk={uvIndex >= 8}
          onClick={() => setShowUVInfo(true)}
          delay={0.2}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Pressure" 
          value={pressure} 
          unit="hPa" 
          icon={<Gauge size={18} className="text-emerald-300" />} 
          delay={0.22}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Precipitation" 
          value={precipitation} 
          unit="mm" 
          icon={<CloudRain size={18} className="text-blue-400" />} 
          delay={0.24}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Cloud Cover" 
          value={cloudCover} 
          unit="%" 
          icon={<Cloud size={18} className="text-white/60" />} 
          delay={0.26}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Visibility" 
          value={visibility / 1000} 
          unit="km" 
          icon={<Eye size={18} className="text-indigo-300" />} 
          delay={0.28}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Feels Like" 
          value={displayFeelsLike} 
          unit={`°${tempUnit}`} 
          icon={<Thermometer size={18} className="text-rose-300" />} 
          delay={0.3}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Sunrise" 
          value={formatTime(sunrise)} 
          icon={<Sunrise size={18} className="text-orange-300" />} 
          delay={0.35}
          isAtmosphereMode={isAtmosphereMode}
        />
        <Metric 
          label="Sunset" 
          value={formatTime(sunset)} 
          icon={<Sunset size={18} className="text-purple-300" />} 
          delay={0.4}
          isAtmosphereMode={isAtmosphereMode}
        />
      </div>

      <AnimatePresence>
        {showUVInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "bg-white/5 border rounded-[32px] p-6 sm:p-8 relative transition-colors duration-500",
              uvStatus.borderColor,
              uvStatus.bgColor
            )}>
              <button 
                onClick={() => setShowUVInfo(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/30 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col xl:flex-row gap-10 items-start">
                <div className="flex flex-col items-center justify-center min-w-[220px] w-full xl:w-auto p-8 rounded-[24px] bg-white/5 border border-white/5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 text-center">Solar Radiation Intensity</span>
                  <div className="relative">
                    <span className={cn("text-6xl sm:text-7xl font-thin tracking-tighter mb-1 block", uvStatus.color)}>{uvIndex}</span>
                    {uvStatus.risk && (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-2 -right-6"
                      >
                        <AlertTriangle size={24} className={uvStatus.color} />
                      </motion.div>
                    )}
                  </div>
                  <span className={cn("text-sm font-black uppercase tracking-[0.4em]", uvStatus.color)}>{uvStatus.label}</span>
                </div>

                <div className="space-y-8 flex-1 w-full">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/10" />
                      Global Solar UV Index
                      <span className="h-px flex-1 bg-white/10" />
                    </h4>
                    
                    {/* Detailed Interactive Scale */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-3 px-1">
                      {uvScale.map((level) => {
                        const isActive = (level.label === uvStatus.label) || (uvIndex >= 11 && level.label === 'Extr') || (uvIndex >= 8 && level.label === 'V. High' && uvIndex <= 10);
                        return (
                          <div key={level.label} className="space-y-2">
                             <div className={cn(
                               "h-2 w-full rounded-full transition-all duration-500",
                               level.color,
                               isActive ? "opacity-100 scale-y-125 shadow-[0_0_15px_currentColor]" : "opacity-20"
                             )} />
                             <div className="text-center px-1">
                               <span className={cn(
                                 "text-[8px] font-black block uppercase mb-0.5",
                                 isActive ? "text-white" : "text-white/20"
                               )}>{level.label}</span>
                               <span className="text-[7px] text-white/10 font-bold block">{level.range}</span>
                             </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* UV Trend Chart */}
                    <div className="space-y-3 pt-2">
                       <h5 className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">24-Hour Intensity Forecast</h5>
                       <UVTrendChart data={hourly} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Health Implications</h5>
                      <p className="text-xs text-white/60 leading-relaxed font-light">
                        {uvIndex >= 8 
                          ? "Critical risk level. Unprotected skin and eyes are susceptible to severe burns in under 15 minutes. Long-term DNA damage and heavy ocular strain are possible."
                          : uvIndex >= 3
                          ? "Moderate to high risk. Sunburn can occur relatively quickly without protection, especially for those with fair skin."
                          : "Minimal risk from the sun. Most people can stay outside safely for extended periods with minimal protection."
                        }
                      </p>
                    </div>

                    <div className="space-y-3">
                       <h5 className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Live Recommendation</h5>
                       <div className={cn(
                         "p-4 rounded-2xl border flex items-center gap-4 transition-colors",
                         uvStatus.borderColor,
                         "bg-white/5"
                       )}>
                         <div className={cn("p-2 rounded-lg bg-current opacity-10 shrink-0", uvStatus.color)} />
                         <p className="text-xs font-medium text-white/80 leading-snug">
                           {uvStatus.advice}
                         </p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
