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
    <div className="flex items-center gap-3 p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
      <img 
        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
        alt={weather.description}
        className="w-10 h-10"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-medium text-sm">{Math.round(weather.temp)}°C</span>
          </div>
          <span className="text-xs text-muted-foreground capitalize truncate">{weather.description}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" /> {weather.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" /> {Math.round(weather.windSpeed)} m/s
          </span>
        </div>
      </div>
    </div>
  );
};
