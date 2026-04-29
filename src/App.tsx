import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getWeatherData, getWeatherVibe, getLocationFromCoords } from './services/weatherService';
import { WeatherData, SearchSuggestion, UnitSettings } from './types';
import { WeatherBackground, WeatherBackgroundMode } from './components/WeatherBackground';
import { SearchBar } from './components/SearchBar';
import { WeatherIcon } from './components/WeatherIcon';
import { WeatherMetrics } from './components/WeatherMetrics';
import { ForecastSection } from './components/ForecastSection';
import { UnitControls } from './components/UnitControls';
import { WeatherAlerts } from './components/WeatherAlerts';
import { PollenSection } from './components/PollenSection';
import { AQISection } from './components/AQISection';
import { LocationConfirmModal } from './components/LocationConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RotateCw, Check } from 'lucide-react';
import { convertTemperature } from './lib/conversions';
import { cn } from './lib/utils';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<WeatherBackgroundMode>('atmosphere');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [units, setUnits] = useState<UnitSettings>({
    temperature: 'celsius',
    windSpeed: 'kmh',
    refreshRate: 30 // Default 30 minutes
  });
  const [pendingLocation, setPendingLocation] = useState<SearchSuggestion | null>(null);

  const fetchWeather = async (lat: number, lon: number, name: string, country: string) => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    try {
      const data = await getWeatherData(lat, lon, name, country);
      
      // Minimum 5 second delay for engagement as requested
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 5000 - elapsed);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      setWeather(data);
      setLastUpdated(new Date());
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Could not update weather. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (!weather || isRefreshing) return;
    setIsRefreshing(true);
    fetchWeather(
      weather.location.lat,
      weather.location.lon,
      weather.location.name,
      weather.location.country
    );
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { name, country } = await getLocationFromCoords(latitude, longitude);
            fetchWeather(latitude, longitude, name, country);
          } catch (err) {
            fetchWeather(latitude, longitude, 'Custom Location', '');
          }
        },
        () => {
          setError('Location access denied. Using London as default.');
          fetchWeather(51.5074, -0.1278, 'London', 'United Kingdom');
        }
      );
    } else {
      setError('Geolocation not supported.');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Initial fetch: London as fallback
    fetchWeather(51.5074, -0.1278, 'London', 'United Kingdom');
  }, []);

  useEffect(() => {
    if (!weather) return;

    const intervalId = setInterval(() => {
      fetchWeather(
        weather.location.lat,
        weather.location.lon,
        weather.location.name,
        weather.location.country
      );
    }, units.refreshRate * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [weather?.location.lat, weather?.location.lon, units.refreshRate]);

  const atmosphere = weather ? getWeatherVibe(weather.current.conditionCode) : 'clear';
  const isDay = weather ? weather.current.isDay : true;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/30">
      <WeatherBackground 
        atmosphere={atmosphere} 
        isDay={isDay} 
        latitude={weather?.location.lat}
        longitude={weather?.location.lon}
        mode={backgroundMode}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col min-h-screen relative z-10 pointer-events-none">
        {/* Header / Search */}
        <div className="mb-12 pointer-events-none">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 shrink-0 pointer-events-auto"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 cursor-pointer",
                backgroundMode === 'atmosphere' 
                  ? "bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg" 
                  : "bg-transparent border-transparent"
              )}>
                <WeatherIcon code={weather?.current.conditionCode || 0} isDay={isDay} size={28} />
              </div>
              <div className="flex flex-col items-start gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Atmosphere</h1>
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700",
                    backgroundMode === 'atmosphere'
                      ? "text-white/40 bg-white/5 backdrop-blur-md border border-white/10"
                      : "text-white/60 bg-transparent border-transparent"
                  )}>
                    {weather 
                      ? format(new Date(new Date().toLocaleString('en-US', { timeZone: weather.location.timezone })), 'EEEE, MMMM do')
                      : format(currentTime, 'EEEE, MMMM do')}
                  </span>
                  <span className={cn(
                    "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700",
                    backgroundMode === 'atmosphere'
                      ? "text-white/40 bg-white/5 backdrop-blur-md border border-white/10"
                      : "text-white/60 bg-transparent border-transparent"
                  )}>
                    {weather 
                      ? format(new Date(new Date().toLocaleString('en-US', { timeZone: weather.location.timezone })), 'HH:mm:ss')
                      : format(currentTime, 'HH:mm:ss')}
                  </span>
                  {weather?.location.timezone && (
                    <span className={cn(
                      "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700",
                      backgroundMode === 'atmosphere'
                        ? "text-sky-400/60 bg-sky-400/5 backdrop-blur-md border border-sky-400/10"
                        : "text-sky-400 bg-transparent border-transparent"
                    )}>
                      {weather.location.timezone.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
            
              <div className="flex-1 w-full flex items-center gap-4 pointer-events-auto">
                <SearchBar 
                  onSelect={(s) => setPendingLocation(s)}
                  onLocate={handleLocate}
                  isAtmosphereMode={backgroundMode === 'atmosphere'}
                />
                
                <div className="flex items-center gap-2">
                  {lastUpdated && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="hidden sm:flex flex-col items-end mr-2"
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/20 leading-none mb-1">Last Alignment</span>
                      <span className="text-[10px] font-medium text-sky-400/40 tabular-nums">
                        {format(lastUpdated, 'HH:mm:ss')}
                      </span>
                    </motion.div>
                  )}
                  
                  <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block" />

                  <UnitControls 
                    settings={units} 
                    onUpdate={setUnits} 
                    backgroundMode={backgroundMode}
                    onBackgroundModeChange={setBackgroundMode}
                    isAtmosphereMode={backgroundMode === 'atmosphere'}
                  />
                  
                  <button
                    onClick={handleRefresh}
                    disabled={loading || isRefreshing}
                    className={cn(
                      "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 overflow-hidden group duration-700 cursor-pointer",
                      backgroundMode === 'atmosphere'
                        ? "bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20"
                        : "bg-transparent border-transparent hover:bg-white/5",
                      isRefreshing && "border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.3)]",
                      showSuccess && "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    )}
                    title="Refresh atmospheric data"
                  >
                    <AnimatePresence>
                      {showSuccess && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.5 }}
                          className="absolute inset-0 bg-emerald-500/20 z-20 flex items-center justify-center backdrop-blur-sm"
                        >
                          <Check size={16} className="text-emerald-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isRefreshing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-[#020617]/40 backdrop-blur-sm"
                      >
                        <span className="text-[7px] font-black tracking-widest text-sky-400 animate-pulse">SYNCING</span>
                      </motion.div>
                    )}
                    
                    <RotateCw 
                      size={20} 
                      className={cn(
                        "transition-all duration-700 relative z-10",
                        (isRefreshing || showSuccess) ? "scale-0 opacity-0" : "text-white/60 group-hover:text-white group-hover:scale-110"
                      )} 
                    />

                    {/* Progress Ring for Refresh */}
                    {isRefreshing && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <motion.circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="transparent"
                          className="text-sky-400/20"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 5, ease: "linear" }}
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/20 backdrop-blur-lg border border-rose-500/30 p-4 rounded-2xl flex items-center gap-3 text-rose-200 mb-8"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading && !weather ? (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#020617]">
            {/* Animating Immersive Sky Background */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.15)_0%,transparent_100%)]"
              />
              <motion.div 
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.1, 0.3, 0.1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(14,165,233,0.1)_0%,transparent_70%)]"
              />
              
              {/* Ethereal Volumetric Clouds */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    x: ['-40%', '140%'],
                    y: [`${Math.sin(i) * 15}%`, `${Math.cos(i) * 15}%`],
                    opacity: [0, 0.25, 0],
                  }}
                  transition={{ 
                    duration: 40 + i * 15, 
                    repeat: Infinity, 
                    ease: "linear",
                    delay: i * -12 
                  }}
                  className="absolute blur-[150px] bg-white/10 rounded-full"
                  style={{ 
                    width: `${500 + i * 250}px`, 
                    height: `${400 + i * 150}px`,
                    top: `${-10 + i * 20}%`,
                    left: '-40%'
                  }}
                />
              ))}

              {/* Shimmering Particles */}
              {[...Array(60)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  animate={{ 
                    opacity: [0.1, 0.5, 0.1],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 4, 
                    repeat: Infinity, 
                    delay: Math.random() * 5 
                  }}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full"
                  style={{ 
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center"
            >

              <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-12 flex items-center justify-center">
                {/* Spectral Dust / Particles */}
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: 360,
                      x: [Math.cos(i) * 90, Math.cos(i) * 130, Math.cos(i) * 90],
                      y: [Math.sin(i) * 90, Math.sin(i) * 130, Math.sin(i) * 90],
                      opacity: [0.05, 0.4, 0.05],
                      scale: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      rotate: { duration: 20 + i, repeat: Infinity, ease: "linear" },
                      duration: 6 + i % 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full blur-[0.5px]"
                  />
                ))}

                {/* Refraction Rings with Prismatic Glow */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: i % 2 === 0 ? 360 : -360,
                      scale: [1, 1.05, 1],
                      borderColor: [
                        "rgba(255,255,255,0.05)",
                        "rgba(56,189,248,0.1)",
                        "rgba(255,189,248,0.1)",
                        "rgba(255,255,255,0.05)"
                      ]
                    }}
                    transition={{ 
                      rotate: { duration: 30 + i * 10, repeat: Infinity, ease: "linear" },
                      scale: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
                      borderColor: { duration: 10, repeat: Infinity }
                    }}
                    className="absolute inset-0 border border-white/10 rounded-full"
                    style={{ padding: `${i * 18}px`, filter: 'blur(1px)' }}
                  />
                ))}
                
                {/* Core Atmospheric Nucleus */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 50px rgba(255,255,255,0.1)",
                      "0 0 140px rgba(56,189,248,0.4)",
                      "0 0 50px rgba(255,255,255,0.1)"
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-24 h-24 sm:w-28 sm:h-28 bg-white/5 backdrop-blur-3xl rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden group"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
                  />
                  <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.8, 1],
                        opacity: [0.6, 1, 0.6],
                        filter: ["blur(4px)", "blur(10px)", "blur(4px)"]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-4 h-4 bg-white rounded-full relative"
                    >
                      <motion.div 
                        animate={{ 
                          scale: [1, 3, 1],
                          opacity: [0, 0.6, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-sky-400 rounded-full blur-[4px]"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              <div className="text-center space-y-10">
                <div className="space-y-4 px-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-4 mb-2"
                  >
                    <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-white/20" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.6em] text-white/40">Observing Celestial Gates</span>
                    <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-white/20" />
                  </motion.div>
                  
                  <motion.h2 
                    animate={{ 
                      opacity: [0.6, 1, 0.6],
                      letterSpacing: ["0.6em", "0.8em", "0.6em"]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-xs sm:text-sm font-black uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                  >
                    Syncing Star Map
                  </motion.h2>
                  
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[8px] sm:text-[10px] font-bold text-sky-400/50 uppercase tracking-[0.4em]">
                      Celestial Matrix Alignment
                    </p>
                    <div className="w-40 sm:w-48 h-0.5 bg-white/5 rounded-full overflow-hidden relative">
                      <motion.div 
                        animate={{ 
                          x: ['-100%', '100%']
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent w-1/2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      {[...Array(3)].map((_, j) => (
                        <motion.div
                          key={j}
                          animate={{ 
                            opacity: [0.1, 0.8, 0.1],
                            scale: [0.8, 1.2, 0.8]
                          }}
                          transition={{ 
                            duration: 1, 
                            repeat: Infinity, 
                            delay: (i * 0.2) + (j * 0.1),
                            ease: "easeInOut" 
                          }}
                          className="w-1 h-1 bg-sky-400/60 rounded-full"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Ambient Depth Layer */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.05, 0.12, 0.05]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15)_0%,transparent_70%)] blur-[100px]"
              />
            </div>
          </div>
        ) : weather ? (
          <div className="flex-1 overflow-auto pointer-events-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
              {/* High-Impact Hero Section */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "relative rounded-[48px] overflow-hidden group mb-12 transition-all duration-700",
                  backgroundMode === 'atmosphere'
                    ? "p-8 sm:p-12 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
                    : "p-4 sm:p-6 bg-transparent border-transparent shadow-none scale-95 origin-left"
                )}
              >
                {/* Subtle Animated Glow */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                  className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-sky-400/20 blur-[120px] rounded-full"
                />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "px-3 py-1 rounded-full transition-all duration-700",
                        backgroundMode === 'atmosphere'
                          ? "bg-sky-500/20 border border-sky-400/30 shadow-lg"
                          : "bg-transparent border-transparent shadow-none"
                      )}>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                          backgroundMode === 'atmosphere' ? "text-sky-300" : "text-sky-400"
                        )}>Current Atmosphere</span>
                      </div>
                      {weather.alerts.length > 0 && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full animate-pulse transition-all",
                          backgroundMode === 'atmosphere'
                            ? "bg-rose-500/20 border border-rose-400/30"
                            : "bg-transparent border-transparent"
                        )}>
                          <AlertCircle size={10} className="text-rose-400" />
                          <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest">{weather.alerts.length} Alert{weather.alerts.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-0">
                      <h1 className="text-5xl sm:text-7xl font-thin tracking-tighter text-white leading-none">
                        {weather.location.name}
                      </h1>
                      <p className="text-xs sm:text-sm font-medium text-white/40 tracking-[0.2em] uppercase mt-4">
                        {weather.location.country} • {format(new Date(new Date().toLocaleString('en-US', { timeZone: weather.location.timezone })), 'EEEE, MMMM do')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className="text-right">
                      <motion.div 
                        key={`${units.temperature}-${weather.current.temp}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl sm:text-[10rem] font-thin tracking-tighter text-white leading-none inline-flex items-start"
                      >
                        {convertTemperature(weather.current.temp, units.temperature)}
                        <span className="text-4xl sm:text-6xl mt-6 opacity-30 font-light">°</span>
                      </motion.div>
                      <p className="text-sm sm:text-lg font-black text-white/50 uppercase tracking-[0.3em] mt-2">
                        {weather.current.description}
                      </p>
                    </div>
                    <div className={cn(
                      "p-8 sm:p-10 rounded-[48px] transition-all duration-500 hover:scale-105 active:scale-95 group-hover:bg-white/10 cursor-pointer",
                      backgroundMode === 'atmosphere'
                        ? "bg-white/5 border border-white/10 shadow-2xl"
                        : "bg-transparent border-transparent"
                    )}>
                      <WeatherIcon code={weather.current.conditionCode} isDay={weather.current.isDay} size={80} className="sm:w-[100px] sm:h-[100px]" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Weather Analytics */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-12">
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Environmental Diagnostics</h2>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <WeatherMetrics 
                      windSpeed={weather.current.windSpeed}
                      windDir={weather.current.windDir}
                      humidity={weather.current.humidity}
                      uvIndex={weather.current.uvIndex}
                      visibility={weather.current.visibility}
                      pressure={weather.current.pressure}
                      cloudCover={weather.current.cloudCover}
                      precipitation={weather.current.precipitation}
                      feelsLike={weather.current.feelsLike}
                      sunrise={weather.current.sunrise}
                      sunset={weather.current.sunset}
                      units={units}
                    />
                  </section>
                  
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Temporal Projection</h2>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <ForecastSection 
                      hourly={weather.hourly} 
                      daily={weather.daily}
                      units={units}
                      timezone={weather.location.timezone}
                    />
                  </section>
                </div>

                <div className="space-y-12">
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Atmosphere</h2>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <AQISection data={weather.airQuality} />
                  </section>

                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Botany Report</h2>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <PollenSection data={weather.pollen} />
                  </section>
                </div>
              </div>

              {weather.alerts.length > 0 && (
                <section className="pt-8">
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-[11px] font-black text-rose-500/50 uppercase tracking-[0.4em]">Security Alerts</h2>
                    <div className="h-px flex-1 bg-rose-500/10" />
                  </div>
                  <WeatherAlerts alerts={weather.alerts} />
                </section>
              )}
              
              <footer className="pt-24 pb-8 flex flex-col items-center gap-6">
                <div className="flex items-center gap-10">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Telemetry Source</span>
                    <span className="text-xs font-bold text-white/50">NOAA / Open-Meteo V5</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Compute Mode</span>
                    <span className="text-xs font-bold text-sky-400/60 uppercase">Maximum Precision</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-px w-20 bg-white/10" />
                  <p className="text-[10px] text-white/10 font-medium uppercase tracking-[5px]">
                    Atmospheric Precision Engine. 2026 Edition
                  </p>
                </div>
              </footer>
            </div>
          </div>
        ) : null}
      </main>

      {/* Background Noise Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* Location Confirmation Modal */}
      <LocationConfirmModal 
        location={pendingLocation}
        onCancel={() => setPendingLocation(null)}
        onConfirm={() => {
          if (pendingLocation) {
            fetchWeather(pendingLocation.lat, pendingLocation.lon, pendingLocation.name, pendingLocation.country);
            setPendingLocation(null);
          }
        }}
      />
    </div>
  );
}
