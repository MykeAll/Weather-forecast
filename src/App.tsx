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
import { AlertCircle, RotateCw, Check, Cloud } from 'lucide-react';
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
      let userMessage = 'Could not update weather. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('SYSTEM_LIMIT_REACHED')) {
          userMessage = 'ATMOSPHERIC_BUSY: Our satellite bandwidth is temporarily capped. Retrying in automated sequence...';
        } else if (err.message.includes('SAT_COMM_FAILURE')) {
          userMessage = 'COMM_FAILURE: Weather telemetry hubs are currently unresponsive. Maintenance in progress.';
        } else if (err.message.includes('INVALID_COORDINATES')) {
          userMessage = 'COORDINATE_ERROR: These coordinates appear outside mapped sectors. Telemetry unavailable.';
        } else if (err.message.includes('LINK_UNSTABLE')) {
          userMessage = 'LINK_UNSTABLE: Data packet loss detected. Check your local mesh connection.';
        } else {
          userMessage = err.message;
        }
      }
      setError(userMessage);
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
        windSpeed={weather?.current.windSpeed}
        temperature={weather?.current.temp}
      />
      
      <main className={cn(
        "flex flex-col min-h-screen relative z-10 pointer-events-none transition-all duration-1000",
        backgroundMode === 'globe' ? "max-w-none w-full" : "max-w-7xl mx-auto px-6 py-12"
      )}>
        {/* Header / Search */}
        <div className={cn(
          "mb-12 pointer-events-none transition-all duration-700",
          backgroundMode === 'globe' ? "p-6 lg:fixed lg:top-0 lg:left-0 lg:w-full lg:z-[60] bg-black/20 backdrop-blur-md border-b border-white/5" : 
          backgroundMode === 'radar' ? "p-4 sm:p-6 fixed top-0 left-0 w-full z-[60] bg-transparent" : ""
        )}>
          <div className={cn(
            "flex gap-4 sm:gap-8 mb-12",
            (backgroundMode === 'globe' || backgroundMode === 'radar') 
              ? "flex-col sm:flex-row items-start sm:items-center justify-between max-w-7xl mx-auto mb-0" 
              : "flex-col md:flex-row items-center justify-between"
          )}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 shrink-0 pointer-events-auto",
                backgroundMode === 'radar' && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              )}
            >
              <div 
                style={{ borderWidth: '1px', borderColor: '#f1eaea' }}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 cursor-pointer shadow-md",
                  backgroundMode === 'radar' ? "bg-black/60 border-white/20" :
                  backgroundMode === 'atmosphere' 
                    ? "bg-black/60 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20" 
                    : "bg-white/5 backdrop-blur-md border border-white/10"
                )}
              >
                <WeatherIcon code={weather?.current.conditionCode || 0} isDay={isDay} size={28} />
              </div>
              <div className="flex flex-col items-start gap-2">
                <h1 className={cn(
                   "text-2xl font-bold tracking-tight text-white underline",
                   backgroundMode === 'radar' ? "text-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-shadow-md"
                )}>
                  Atmosphere
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span 
                    style={{ borderWidth: '1.4px', borderColor: '#dad8d8' }}
                    className={cn(
                      "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700 shadow-sm",
                      backgroundMode === 'radar' ? "text-white text-shadow-sm bg-black/40 border-white/20" :
                      backgroundMode === 'atmosphere'
                        ? "text-white/40 bg-black/60 backdrop-blur-md border border-white/10"
                        : "text-white/80 bg-black/20 backdrop-blur-sm border border-white/10"
                    )}
                  >
                    {weather 
                      ? format(new Date(new Date().toLocaleString('en-US', { timeZone: weather.location.timezone })), 'EEEE, MMMM do')
                      : format(currentTime, 'EEEE, MMMM do')}
                  </span>
                  <span 
                    style={{ borderWidth: '3px', borderColor: '#f0e8e8', backgroundColor: backgroundMode === 'radar' ? '#1e3a8a' : '#1e3a8a' }}
                    className={cn(
                      "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700 shadow-sm",
                      backgroundMode === 'radar' ? "text-white text-shadow-[0_1px_2px_rgba(0,0,0,0.5)] border-white/30" :
                      backgroundMode === 'atmosphere'
                        ? "text-white/80 bg-black/60 backdrop-blur-md border border-white/10 text-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                        : "text-white/80 bg-black/20 backdrop-blur-sm border border-white/10"
                    )}
                  >
                    {weather 
                      ? format(new Date(new Date().toLocaleString('en-US', { timeZone: weather.location.timezone })), 'HH:mm:ss')
                      : format(currentTime, 'HH:mm:ss')}
                  </span>
                  {weather?.location.timezone && (
                    <span 
                      style={{ borderWidth: '1.8px', borderColor: '#24c2e7', backgroundColor: 'rgba(0,0,0,0.6)' }}
                      className={cn(
                        "text-[9px] uppercase tracking-[0.2em] font-black py-1 px-2.5 rounded-full transition-all duration-700 shadow-sm",
                        backgroundMode === 'radar' ? "text-sky-300 text-shadow-sm border-white/20" :
                        backgroundMode === 'atmosphere'
                          ? "text-sky-400/80 bg-black/60 backdrop-blur-md border border-white/10"
                          : "text-sky-400 bg-black/20 backdrop-blur-sm border border-sky-400/10"
                      )}
                    >
                      {weather.location.timezone.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
            
              <div className={cn(
                "flex-1 w-full flex items-center gap-4 pointer-events-auto",
                backgroundMode === 'radar' && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              )}>
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
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest leading-none mb-1",
                        backgroundMode === 'radar' ? "text-white/40 text-shadow-sm" : "text-white/20"
                      )}>Last Alignment</span>
                      <span className={cn(
                        "text-[10px] font-medium tabular-nums",
                        backgroundMode === 'radar' ? "text-sky-300 text-shadow-sm font-bold" : "text-sky-400/40"
                      )}>
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
                    style={{ borderColor: '#f0e9e9', borderWidth: '2px' }}
                    className={cn(
                      "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 overflow-hidden group duration-700 cursor-pointer shadow-md",
                      backgroundMode === 'radar' ? "bg-black/60 border-white/20 shadow-black/40" :
                      backgroundMode === 'atmosphere'
                        ? "bg-black/60 backdrop-blur-xl border border-white/20 hover:bg-black/70 shadow-lg shadow-black/20"
                        : "bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10",
                      backgroundMode === 'radar' && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
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

              <div className="text-center space-y-12">
                <div className="space-y-6 px-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.8em] text-sky-400/60 ml-[0.8em]">Welcome</span>
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </motion.div>
                  
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8 }}
                      className="relative inline-block"
                    >
                      <motion.h1 
                        className="text-3xl sm:text-4xl font-black uppercase tracking-[0.4em] text-white"
                      >
                        Mykeall
                      </motion.h1>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                        className="absolute -bottom-2 left-0 h-[3px] bg-gradient-to-r from-sky-400 to-transparent"
                      />
                    </motion.div>
                    
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 }}
                      className="text-[12px] sm:text-sm font-black text-sky-400/80 uppercase tracking-[0.6em] pt-4"
                    >
                      Atmospheric Prime
                    </motion.p>
                  </div>
                  
                <div className="flex flex-col items-center gap-4 pt-1 sm:pt-4">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                      />
                      <motion.p 
                        className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.4em] sm:tracking-[0.5em]"
                      >
                        Celestial System: Optimized
                      </motion.p>
                    </div>
                    
                    <div className="w-56 sm:w-64 space-y-6">
                      <div className="h-[1px] w-full bg-white/10 rounded-full overflow-hidden relative">
                        <motion.div 
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400 to-transparent w-3/4"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 text-left">
                          <span className="block text-[7px] font-black text-white/20 uppercase tracking-widest">Environment</span>
                          <span className="block text-[8px] font-mono text-sky-400/80 leading-tight">ION_SCAN_READY</span>
                        </div>
                        
                        <div className="space-y-2 text-right">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.5 }}
                            className="bg-sky-500/10 border border-sky-400/20 px-3 py-1 rounded-full inline-block"
                          >
                            <span className="text-[9px] font-black text-sky-300 uppercase tracking-widest">Welcome Home</span>
                          </motion.div>
                          
                          <div className="space-y-1">
                            <span className="block text-[7px] font-black text-white/20 uppercase tracking-widest">Atmosphere</span>
                            <span className="block text-[8px] font-mono text-sky-400/80 leading-tight">ACTIVE_PRIME_01</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="flex items-center justify-center gap-6"
                >
                  {[
                    { label: 'CALIB', val: '99%' },
                    { label: 'UPLINK', val: 'STABLE' },
                    { label: 'REGION', val: 'GLOBAL' }
                  ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                      <span className="text-[9px] font-bold text-sky-400/40 tracking-tighter">{stat.val}</span>
                    </div>
                  ))}
                </motion.div>
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
          <div className={cn(
            "flex-1 flex flex-col transition-all duration-1000",
            backgroundMode === 'globe' ? "overflow-hidden" : "overflow-auto custom-scrollbar"
          )}>
            <div className={cn(
              "transition-all duration-1000 flex flex-col",
              backgroundMode === 'radar'
                ? "fixed bottom-0 left-0 w-full px-0 pointer-events-auto z-[90]"
              : backgroundMode === 'globe'
                ? "fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-auto z-40" 
                : "flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8"
            )}>
              {/* High-Impact Hero Section */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                   "relative rounded-none overflow-hidden group transition-all duration-700 shrink-0",
                   backgroundMode === 'radar'
                     ? "p-4 px-6 md:px-12 bg-transparent border-none rounded-none shadow-none"
                     : backgroundMode === 'globe'
                     ? "p-8 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[40px]"
                     : "p-8 sm:p-12 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[40px]"
                )}
              >
                {backgroundMode === 'atmosphere' && (
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-sky-400/20 blur-[120px] rounded-full"
                  />
                )}

                <div className={cn(
                  "relative z-10 flex flex-col gap-6",
                  backgroundMode === 'radar' ? "md:flex-row md:items-center md:justify-between w-full gap-4" :
                  (backgroundMode !== 'globe' && backgroundMode !== 'radar') ? "md:flex-row md:items-center justify-between" : "items-center"
                )}>
                  <div className={cn(
                    "space-y-4",
                    backgroundMode === 'radar' ? "text-left md:space-y-1" :
                    (backgroundMode === 'globe' || backgroundMode === 'radar') ? "text-center" : "text-left"
                  )}>
                    <div className={cn(
                      "flex items-center gap-3",
                      backgroundMode === 'radar' ? "justify-start" :
                      (backgroundMode === 'globe' || backgroundMode === 'radar') ? "justify-center" : ""
                    )}>
                      <div className={cn(
                        "px-3 py-1 rounded-full transition-all duration-700",
                        backgroundMode === 'radar' ? "bg-sky-400/10 border border-sky-400/20" :
                        backgroundMode === 'atmosphere'
                          ? "bg-sky-500/20 border border-sky-400/30"
                          : "bg-white/10 border border-white/10"
                      )}>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                          backgroundMode === 'radar' ? "text-sky-400" :
                          backgroundMode === 'atmosphere' ? "text-sky-300" : "text-sky-400"
                        )}>
                          {backgroundMode === 'radar' ? "Sector Scan Active" : "Atmospheric State"}
                        </span>
                      </div>
                      {backgroundMode === 'radar' && (
                        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          {weather.location.lat.toFixed(4)}°N / {weather.location.lon.toFixed(4)}°E
                        </div>
                      )}
                    </div>
                    
                    <div className={cn("space-y-1", backgroundMode === 'radar' && "flex items-baseline gap-3")}>
                      <h1 className={cn(
                        "font-thin tracking-tighter text-white leading-[1.1] transition-all",
                        backgroundMode === 'radar' ? "text-2xl sm:text-3xl text-shadow-xl" :
                        (backgroundMode === 'globe' || backgroundMode === 'radar') ? "text-4xl sm:text-5xl" : "text-5xl sm:text-7xl"
                      )}>
                        {weather.location.name}
                      </h1>
                      <div className="flex items-center gap-3">
                        <p className={cn(
                          "text-[10px] font-black tracking-[0.4em] uppercase",
                          backgroundMode === 'radar' ? "text-sky-400 text-shadow-md" : "text-sky-400/60"
                        )}>
                          {weather.location.country}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center gap-6",
                    backgroundMode === 'radar' ? "space-x-8" :
                    (backgroundMode === 'globe' || backgroundMode === 'radar') ? "justify-center" : "sm:gap-12"
                  )}>
                    <div className={cn(
                      "flex items-center gap-4",
                      backgroundMode === 'radar' ? "text-left" : "text-center"
                    )}>
                      <motion.div 
                        key={`${units.temperature}-${weather.current.temp}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "font-thin tracking-tighter text-white leading-none inline-flex items-start transition-all",
                          backgroundMode === 'radar' ? "text-4xl sm:text-5xl text-shadow-xl" :
                          (backgroundMode === 'globe' || backgroundMode === 'radar') ? "text-6xl sm:text-7xl" : "text-8xl sm:text-[10rem]"
                        )}
                      >
                        {convertTemperature(weather.current.temp, units.temperature)}
                        <span className={cn(
                          "opacity-30 font-light",
                          backgroundMode === 'radar' ? "text-xl mt-0 shadow-none" :
                          (backgroundMode === 'globe' || backgroundMode === 'radar') ? "text-2xl mt-1" : "text-4xl sm:text-6xl mt-6"
                        )}>°</span>
                      </motion.div>
                      {(backgroundMode === 'globe' || backgroundMode === 'radar') && (
                        <div className="flex flex-col">
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-[0.3em]",
                            backgroundMode === 'radar' ? "text-white/90 text-shadow-md" : "text-white/40"
                          )}>
                            {weather.current.description}
                          </p>
                          {backgroundMode === 'radar' && (
                            <span className="text-[8px] font-mono text-white/50 mt-1 uppercase tracking-widest text-shadow-sm">Live Telemetry</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={cn(
                      "rounded-full transition-all duration-500 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0",
                      backgroundMode === 'radar' ? "p-2.5 bg-black/20 border border-white/10 w-12 h-12 backdrop-blur-sm shadow-xl" : 
                      backgroundMode === 'atmosphere'
                        ? "p-8 sm:p-10 bg-white/5 border border-white/10"
                        : "p-4 bg-white/5 border border-white/10",
                      (backgroundMode === 'globe' || backgroundMode === 'radar') ? (backgroundMode === 'radar' ? 'w-12 h-12' : "w-20 h-20") : "w-auto h-auto"
                    )}>
                      <WeatherIcon 
                        code={weather.current.conditionCode} 
                        isDay={weather.current.isDay} 
                        size={backgroundMode === 'radar' ? 24 : (backgroundMode === 'globe' ? 44 : 80)} 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Weather Analytics - Collapsed in Globe/Radar Mode */}
              {(backgroundMode !== 'globe' && backgroundMode !== 'radar') ? (
                <div className="grid gap-8 pb-12 flex-1 grid-cols-1 xl:grid-cols-4">
                  <div className="space-y-12 xl:col-span-3">
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
                        isAtmosphereMode={backgroundMode === 'atmosphere'}
                        hourly={weather.hourly}
                        conditionCode={weather.current.conditionCode}
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
                        isAtmosphereMode={backgroundMode === 'atmosphere'}
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
              ) : null}

              {weather.alerts.length > 0 && (backgroundMode !== 'globe' && backgroundMode !== 'radar') && (
                <section className="pt-8 pb-12">
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-[11px] font-black text-rose-500/50 uppercase tracking-[0.4em]">Security Alerts</h2>
                    <div className="h-px flex-1 bg-rose-500/10" />
                  </div>
                  <WeatherAlerts alerts={weather.alerts} />
                </section>
              )}
              
              {(backgroundMode !== 'globe' && backgroundMode !== 'radar') && (
                <footer className="pt-24 pb-12 flex flex-col gap-6 shrink-0 items-center">
                  <div className="flex items-center justify-center gap-6">
                    {[
                      { label: 'TELEMETRY', val: 'OPEN-METEO' },
                      { label: 'CALIBRATION', val: 'PRIME' }
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                        <span className="text-[9px] font-bold text-sky-400/40">{stat.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-px w-20 bg-white/10" />
                  <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
                    Atmospheric Precision Engine • 2026
                  </p>
                </footer>
              )}
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
