
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feels_like: number;
}

export class WeatherService {
  static async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { lat, lng }
      });

      if (error) {
        console.error('Weather API error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  static async getWeatherForecast(lat: number, lng: number, eventDate: string): Promise<WeatherData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { lat, lng, eventDate }
      });

      if (error) {
        console.error('Weather forecast API error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return null;
    }
  }
}
