import React from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudSnow, 
  CloudFog, 
  CloudDrizzle,
  CloudSun,
  Moon,
  CloudMoon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ code, isDay = true, className, size = 24 }) => {
  // WMO Code mapping
  if (code === 0) return isDay ? <Sun size={size} className={cn("text-yellow-400", className)} /> : <Moon size={size} className={cn("text-indigo-200", className)} />;
  if (code === 1 || code === 2) return isDay ? <CloudSun size={size} className={cn("text-yellow-200", className)} /> : <CloudMoon size={size} className={cn("text-indigo-300", className)} />;
  if (code === 3) return <Cloud size={size} className={cn("text-gray-400", className)} />;
  if (code === 45 || code === 48) return <CloudFog size={size} className={cn("text-gray-300", className)} />;
  if ((code >= 51 && code <= 57)) return <CloudDrizzle size={size} className={cn("text-blue-300", className)} />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} className={cn("text-blue-400", className)} />;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow size={size} className={cn("text-white", className)} />;
  if (code >= 95) return <CloudLightning size={size} className={cn("text-purple-400", className)} />;

  return <Sun size={size} className={cn("text-yellow-400", className)} />;
};
