
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph' | 'ms';

export interface UnitSettings {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  refreshRate: number; // In minutes
}

export interface WeatherAlert {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
}

export interface PollenData {
  alder: number;
  birch: number;
  grass: number;
  mugwort: number;
  olive: number;
  ragweed: number;
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    conditionCode: number;
    windSpeed: number;
    windDir: number;
    humidity: number;
    uvIndex: number;
    visibility: number;
    pressure: number;
    cloudCover: number;
    precipitation: number;
    feelsLike: number;
    isDay: boolean;
    sunrise: string;
    sunset: string;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
    timezone?: string;
  };
  alerts: WeatherAlert[];
  pollen: PollenData | null;
  airQuality: AQIData | null;
}

export interface AQIData {
  index: number;
  label: string;
  color: string;
  pollutants: {
    pm2_5: number;
    pm10: number;
    no2: number;
    o3: number;
    so2: number;
    co: number;
  };
}

export interface HourlyForecast {
  time: string;
  temp: number;
  feelsLike: number;
  conditionCode: number;
  precipitation: number;
  precipitationProbability: number;
  cloudCover: number;
  uvIndex: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  maxfeelsLike: number;
  minfeelsLike: number;
  conditionCode: number;
  precipitationSum: number;
}

export interface SearchSuggestion {
  name: string;
  country: string;
  lat: number;
  lon: number;
  admin1?: string;
  population?: number;
  timezone?: string;
  elevation?: number;
}
