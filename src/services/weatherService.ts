
import { logger } from '@/lib/logger';
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
        logger.error('Weather API error:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      return null;
    }
  }

  static async getWeatherForecast(lat: number, lng: number, eventDate: string): Promise<WeatherData | null> {
    try {
      logger.log('Fetching weather forecast for:', { lat, lng, eventDate });
      
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { 
          lat, 
          lng, 
          eventDate: eventDate || new Date().toISOString()
        }
      });

      if (error) {
        logger.error('Weather forecast API error:', error);
        return null;
      }

      logger.log('Weather forecast data received:', data);
      return data;
    } catch (error) {
      logger.error('Error fetching weather forecast:', error);
      return null;
    }
  }

  // Helper method to convert postcode to coordinates (if needed later)
  static async postcodeToCoordinates(postcode: string): Promise<{lat: number, lng: number} | null> {
    try {
      // This would typically use Google Geocoding API or similar
      // For now, return null as this would require additional API setup
      logger.log('Postcode geocoding not implemented yet:', postcode);
      return null;
    } catch (error) {
      logger.error('Error converting postcode to coordinates:', error);
      return null;
    }
  }
}
