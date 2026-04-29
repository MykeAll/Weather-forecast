import { TemperatureUnit, WindSpeedUnit } from '../types';

export function convertTemperature(value: number, toUnit: TemperatureUnit): number {
  if (toUnit === 'fahrenheit') {
    return Math.round((value * 9) / 5 + 32);
  }
  return value; // API returns Celsius by default
}

export function convertWindSpeed(value: number, toUnit: WindSpeedUnit): number {
  if (toUnit === 'mph') {
    return Number((value * 0.621371).toFixed(1));
  }
  if (toUnit === 'ms') {
    return Number((value / 3.6).toFixed(1));
  }
  return value; // API returns km/h by default
}

export function formatTemp(value: number, unit: TemperatureUnit): string {
  return `${value}°${unit === 'celsius' ? 'C' : 'F'}`;
}

export function formatWind(value: number, unit: WindSpeedUnit): string {
  const label = unit === 'kmh' ? 'km/h' : unit === 'mph' ? 'mph' : 'm/s';
  return `${value} ${label}`;
}
