import React, { useEffect, useState } from 'react';
import { Thermometer, Wind, Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feels_like?: number;
}

interface EventWeatherDisplayProps {
  lat?: number | null;
  lng?: number | null;
  eventDate: string;
}

export const EventWeatherDisplay: React.FC<EventWeatherDisplayProps> = ({
  lat,
  lng,
  eventDate
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!lat || !lng) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('weather-data', {
          body: { lat, lng, eventDate }
        });
        
        if (error) {
          console.error('Weather fetch error:', error);
          setError('Weather not available');
          return;
        }
        
        if (data && !data.error) {
          setWeather(data);
        } else {
          setError(data?.error || 'Weather not available');
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [lat, lng, eventDate]);

  if (!lat || !lng) return null;
  
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
        <span className="text-xs text-muted-foreground">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <img 
        src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
        alt={weather.description}
        className="w-6 h-6 -ml-1"
      />
      <span className="font-medium text-foreground">{Math.round(weather.temp)}°C</span>
      <span className="capitalize">{weather.description}</span>
      <span className="text-xs">•</span>
      <Wind className="h-3 w-3" />
      <span>{Math.round(weather.windSpeed)} m/s</span>
    </div>
  );
};
