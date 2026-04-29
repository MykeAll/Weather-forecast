import { WeatherData, SearchSuggestion, WeatherAlert } from '../types';

const WMO_MAP: Record<number, { description: string; atmosphere: string }> = {
  0: { description: 'Clear sky', atmosphere: 'clear' },
  1: { description: 'Mainly clear', atmosphere: 'clear' },
  2: { description: 'Partly cloudy', atmosphere: 'cloudy' },
  3: { description: 'Overcast', atmosphere: 'cloudy' },
  45: { description: 'Fog', atmosphere: 'fog' },
  48: { description: 'Depositing rime fog', atmosphere: 'fog' },
  51: { description: 'Light drizzle', atmosphere: 'rain' },
  53: { description: 'Moderate drizzle', atmosphere: 'rain' },
  55: { description: 'Dense drizzle', atmosphere: 'rain' },
  56: { description: 'Light freezing drizzle', atmosphere: 'snow' },
  57: { description: 'Dense freezing drizzle', atmosphere: 'snow' },
  61: { description: 'Slight rain', atmosphere: 'rain' },
  63: { description: 'Moderate rain', atmosphere: 'rain' },
  65: { description: 'Heavy rain', atmosphere: 'rain' },
  66: { description: 'Light freezing rain', atmosphere: 'snow' },
  67: { description: 'Heavy freezing rain', atmosphere: 'snow' },
  71: { description: 'Slight snowfall', atmosphere: 'snow' },
  73: { description: 'Moderate snowfall', atmosphere: 'snow' },
  75: { description: 'Heavy snowfall', atmosphere: 'snow' },
  77: { description: 'Snow grains', atmosphere: 'snow' },
  80: { description: 'Slight rain showers', atmosphere: 'rain' },
  81: { description: 'Moderate rain showers', atmosphere: 'rain' },
  82: { description: 'Violent rain showers', atmosphere: 'rain' },
  85: { description: 'Slight snow showers', atmosphere: 'snow' },
  86: { description: 'Heavy snow showers', atmosphere: 'snow' },
  95: { description: 'Thunderstorm', atmosphere: 'thunderstorm' },
  96: { description: 'Thunderstorm with slight hail', atmosphere: 'thunderstorm' },
  99: { description: 'Thunderstorm with heavy hail', atmosphere: 'thunderstorm' },
};

function generateAlerts(current: any): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const code = current.weather_code;
  const wind = current.wind_speed_10m;
  const temp = current.temperature_2m;
  const uv = current.uv_index;

  // WMO Code Alerts
  if (code >= 95) {
    alerts.push({
      title: 'Thunderstorm Warning',
      description: 'Severe electrical activity detected. Seek shelter and avoid high ground.',
      severity: 'critical',
      type: 'storm'
    });
  } else if (code === 82 || code === 65) {
    alerts.push({
      title: 'Heavy Rain Alert',
      description: 'Intense precipitation may cause localized flooding. Drive with caution.',
      severity: 'warning',
      type: 'rain'
    });
  } else if (code === 75 || code === 86) {
    alerts.push({
      title: 'Severe Snowfall',
      description: 'Heavy snow expected. Reduced visibility. Avoid unnecessary travel.',
      severity: 'warning',
      type: 'snow'
    });
  }

  // Wind Alerts
  if (wind > 50) {
    alerts.push({
      title: 'High Wind Warning',
      description: `Damaging winds of ${Math.round(wind)}km/h detected. Secure loose outdoor objects.`,
      severity: wind > 75 ? 'critical' : 'warning',
      type: 'wind'
    });
  }

  // Pressure Alerts (Rapid changes)
  const pressure = current.surface_pressure;
  if (pressure < 1000) {
    alerts.push({
      title: 'Low Pressure System',
      description: 'Atmospheric pressure is notably low. Unsettled weather and potential storm systems expected.',
      severity: 'info',
      type: 'pressure'
    });
  } else if (pressure > 1030) {
    alerts.push({
      title: 'High Pressure System',
      description: 'Strong high pressure detected. Expect stable, clear conditions but potential for air stagnancy in urban areas.',
      severity: 'info',
      type: 'pressure'
    });
  }

  // Precipitation Precision
  if (current.precipitation > 0) {
    alerts.push({
      title: 'Active Precipitation',
      description: `${current.precipitation}mm/h of precipitation currently falling at this coordinate.`,
      severity: 'info',
      type: 'precipitation'
    });
  }

  // Temp Alerts
  if (temp > 35) {
    alerts.push({
      title: 'Extreme Heat Alert',
      description: `Excessive heat reaching ${Math.round(temp)}°C. Stay hydrated and avoid direct sun.`,
      severity: 'critical',
      type: 'heat'
    });
  } else if (temp < -10) {
    alerts.push({
      title: 'Extreme Cold Warning',
      description: 'Dangerously low temperatures. Risk of frostbite. Layer clothing.',
      severity: 'warning',
      type: 'cold'
    });
  }

  // UV Alerts
  if (uv >= 8) {
    alerts.push({
      title: 'High UV Exposure',
      description: 'Dangerous UV levels. Wear SPF 30+, hat, and sunglasses.',
      severity: 'warning',
      type: 'uv'
    });
  }

  return alerts;
}

export function getWeatherVibe(code: number): string {
  return WMO_MAP[code]?.atmosphere || 'clear';
}

export function getWeatherDescription(code: number): string {
  return WMO_MAP[code]?.description || 'Unknown';
}

export async function searchLocations(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return [];
  
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  );
  const data = await response.json();
  
  if (!data.results) return [];
  
  return data.results.map((res: any) => ({
    name: res.name,
    country: res.country,
    lat: res.latitude,
    lon: res.longitude,
    admin1: res.admin1,
    population: res.population,
    timezone: res.timezone,
    elevation: res.elevation,
  }));
}

export async function getWeatherData(lat: number, lon: number, locationName: string, country: string): Promise<WeatherData> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,uv_index,visibility,surface_pressure,cloud_cover,precipitation&hourly=temperature_2m,weather_code,is_day,precipitation,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=auto&forecast_days=7`;
  const pollenUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,european_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`;
  
  const [weatherRes, airQualityRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(pollenUrl)
  ]);

  const weatherData = await weatherRes.json();
  const airQualityData = await airQualityRes.json();
  
  const current = weatherData.current;
  const currentCondition = WMO_MAP[current.weather_code] || { description: 'Unknown', atmosphere: 'clear' };
  const alerts = generateAlerts(current);

  const pollen = airQualityData.current ? {
    alder: airQualityData.current.alder_pollen || 0,
    birch: airQualityData.current.birch_pollen || 0,
    grass: airQualityData.current.grass_pollen || 0,
    mugwort: airQualityData.current.mugwort_pollen || 0,
    olive: airQualityData.current.olive_pollen || 0,
    ragweed: airQualityData.current.ragweed_pollen || 0,
  } : null;

  const getAQILabel = (index: number) => {
    if (index <= 20) return { label: 'Good', color: 'text-emerald-400' };
    if (index <= 40) return { label: 'Fair', color: 'text-yellow-400' };
    if (index <= 60) return { label: 'Moderate', color: 'text-orange-400' };
    if (index <= 80) return { label: 'Poor', color: 'text-rose-400' };
    return { label: 'Very Poor', color: 'text-purple-400' };
  };

  const aqiInfo = airQualityData.current ? getAQILabel(airQualityData.current.european_aqi) : { label: 'Unknown', color: 'text-white/40' };

  const aqi = airQualityData.current ? {
    index: airQualityData.current.european_aqi,
    label: aqiInfo.label,
    color: aqiInfo.color,
    pollutants: {
      pm2_5: airQualityData.current.pm2_5 || 0,
      pm10: airQualityData.current.pm10 || 0,
      no2: airQualityData.current.nitrogen_dioxide || 0,
      o3: airQualityData.current.ozone || 0,
      so2: airQualityData.current.sulphur_dioxide || 0,
      co: airQualityData.current.carbon_monoxide || 0,
    }
  } : null;

  return {
    current: {
      temp: Math.round(current.temperature_2m),
      description: currentCondition.description,
      conditionCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
      windDir: current.wind_direction_10m,
      humidity: current.relative_humidity_2m,
      uvIndex: current.uv_index,
      visibility: current.visibility,
      pressure: current.surface_pressure,
      cloudCover: current.cloud_cover,
      precipitation: current.precipitation,
      feelsLike: Math.round(current.apparent_temperature),
      isDay: current.is_day === 1,
      sunrise: weatherData.daily.sunrise[0],
      sunset: weatherData.daily.sunset[0],
    },
    hourly: weatherData.hourly.time.map((time: string, i: number) => ({
      time,
      temp: Math.round(weatherData.hourly.temperature_2m[i]),
      conditionCode: weatherData.hourly.weather_code[i],
      precipitation: weatherData.hourly.precipitation[i],
      cloudCover: weatherData.hourly.cloud_cover[i],
      isDay: weatherData.hourly.is_day[i] === 1,
    })),
    daily: weatherData.daily.time.map((date: string, i: number) => ({
      date,
      maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
      minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
      conditionCode: weatherData.daily.weather_code[i],
      precipitationSum: weatherData.daily.precipitation_sum[i],
    })),
    location: {
      name: locationName,
      country,
      lat,
      lon,
      timezone: weatherData.timezone,
    },
    alerts,
    pollen,
    airQuality: aqi,
  };
}

export async function getLocationFromCoords(lat: number, lon: number): Promise<{ name: string; country: string }> {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
  const data = await response.json();
  const name = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Selected Location';
  const country = data.address.country || '';
  return { name, country };
}
