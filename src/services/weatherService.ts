
interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feels_like: number;
}

export class WeatherService {
  private static apiKey = process.env.OPENWEATHERMAP_API_KEY || 'YOUR_API_KEY';
  private static baseUrl = 'https://api.openweathermap.org/data/2.5';

  static async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        console.error('Weather API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      return {
        temp: data.main.temp,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        feels_like: data.main.feels_like
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  static async getWeatherForecast(lat: number, lng: number, eventDate: string): Promise<WeatherData | null> {
    try {
      const eventTime = new Date(eventDate).getTime();
      const now = new Date().getTime();
      const timeDiff = eventTime - now;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // If event is more than 5 days away, use forecast API
      if (daysDiff > 0 && daysDiff <= 5) {
        const response = await fetch(
          `${this.baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric`
        );

        if (!response.ok) {
          console.error('Weather forecast API error:', response.status, response.statusText);
          return null;
        }

        const data = await response.json();
        
        // Find the forecast closest to the event date
        const targetDate = new Date(eventDate);
        const closestForecast = data.list.reduce((closest: any, current: any) => {
          const currentDate = new Date(current.dt * 1000);
          const closestDate = new Date(closest.dt * 1000);
          
          return Math.abs(currentDate.getTime() - targetDate.getTime()) < 
                 Math.abs(closestDate.getTime() - targetDate.getTime()) ? current : closest;
        });

        return {
          temp: closestForecast.main.temp,
          description: closestForecast.weather[0].description,
          icon: closestForecast.weather[0].icon,
          humidity: closestForecast.main.humidity,
          windSpeed: closestForecast.wind.speed,
          feels_like: closestForecast.main.feels_like
        };
      } else {
        // For current or past events, use current weather
        return this.getCurrentWeather(lat, lng);
      }
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return null;
    }
  }
}
